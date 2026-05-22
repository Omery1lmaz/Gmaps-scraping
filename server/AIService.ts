import OpenAI from 'openai';
import stringSimilarity from 'string-similarity';
import { AIGeneration, Lead } from './dbClient';
import { tokens as openRouterTokens, model as openRouterModel } from './ai/tokens/index';

export interface AIProvider {
  name: string;
  generateText(prompt: string, model?: string): Promise<{ text: string; tokens: number }>;
}

class OpenRouterRotatingProvider implements AIProvider {
  name = 'openrouter';
  private tokens = openRouterTokens.map(t => t.token);
  private currentTokenIndex = 0;

  private getClient(apiKey: string) {
    return new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/gmaps-lead-scraper',
        'X-Title': 'Gmaps Lead Scraper',
      }
    });
  }

  async generateText(prompt: string, overrideModel?: string) {
    const targetModel = overrideModel || openRouterModel || 'gpt-4o-mini';

    for (let attempts = 0; attempts < this.tokens.length; attempts++) {
      const apiKey = this.tokens[this.currentTokenIndex];
      const client = this.getClient(apiKey);

      try {
        const response = await client.chat.completions.create({
          model: targetModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        });

        return {
          text: response.choices[0]?.message?.content || '',
          tokens: response.usage?.total_tokens || 0
        };
      } catch (error: any) {
        if (error?.status === 429 || error?.status === 402 || error?.status === 403 || error?.status >= 500) {
          console.warn(`[OpenRouter] Token index ${this.currentTokenIndex} failed (Status: ${error?.status}). Rotating to next token...`);
          this.currentTokenIndex = (this.currentTokenIndex + 1) % this.tokens.length;
        } else {
          throw error;
        }
      }
    }

    throw new Error('All OpenRouter tokens failed. Rate limits or quotas exceeded on all accounts.');
  }
}

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string = 'openrouter';

  constructor() {
    this.providers.set('openrouter', new OpenRouterRotatingProvider());
  }

  public async generateText(prompt: string, model?: string): Promise<{ text: string; tokens: number }> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');
    return provider.generateText(prompt, model);
  }

  public async generatePersonalizedOutreach(
    lead: any, 
    template: string, 
    tone: string, 
    userId: string,
    previousMessages: string[] = []
  ) {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');

    const prompt = `
      You are an expert sales outreach assistant.
      Target Business: ${lead.businessName}
      Category: ${lead.category}
      City: ${lead.city}
      Rating: ${lead.rating} stars
      Website: ${lead.website}
      Tone: ${tone}
      
      Original Template: "${template}"
      
      TASK: Rewrite the template to be highly personalized for this specific business. 
      Vary the phrasing, structure, and CTA. 
      Ensure it sounds human, not robotic.
      
      IMPORTANT: Keep it under 400 characters for WhatsApp.
      Avoid overly salesy language.
      
      Response: 
    `;

    let attempt = 0;
    let generatedText = '';
    let tokensUsed = 0;
    let similarity = 0;

    while (attempt < 3) {
      const result = await provider.generateText(prompt);
      generatedText = result.text.trim();
      tokensUsed = result.tokens;

      // Spam Similarity Check
      if (previousMessages.length > 0) {
        const matches = stringSimilarity.findBestMatch(generatedText, previousMessages);
        similarity = matches.bestMatch.rating;
        
        if (similarity < 0.8) break; // Unique enough
        attempt++;
      } else {
        break;
      }
    }

    // Save to MongoDB
    const generation = await AIGeneration.create({
      userId,
      leadId: lead._id || lead.id,
      originalText: template,
      generatedText,
      prompt,
      provider: provider.name,
      model: openRouterModel || 'openrouter-model',
      tone,
      tokensUsed,
      spamScore: similarity
    });

    return generation;
  }

  public async analyzeLead(lead: any, userId: string) {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');

    const prompt = `
      Analyze this lead for B2B outreach suitability:
      Business: ${lead.businessName || lead.name}
      Category: ${lead.category}
      Rating: ${lead.rating} (${lead.reviewCount || lead.reviews} reviews)
      Website: ${lead.website}
      
      Rate 1-100 for:
      1. Quality Score (Based on brand strength and presence)
      2. Response Likelihood (Based on niche and size)
      3. Outreach Fit (Is B2B automation a good match?)
      
      Return JSON only:
      { "quality": number, "likelihood": number, "fit": "GOOD" | "MEDIUM" | "POOR", "summary": "short string" }
    `;

    const result = await provider.generateText(prompt);
    const analysis = JSON.parse(result.text.match(/\{.*\}/s)?.[0] || '{}');

    return Lead.findOneAndUpdate(
      { userId, _id: lead._id || lead.id },
      {
        aiQualityScore: analysis.quality,
        aiResponseLikelihood: analysis.likelihood,
        aiOutreachFit: analysis.fit,
        aiAnalysisSummary: analysis.summary
      },
      { returnDocument: 'after' }
    );
  }

  public async suggestReply(lead: any, history: string, promptContext?: string): Promise<string> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');

    const contextInstruction = promptContext 
      ? `Özellikle şu konuda odaklan: "${promptContext}".`
      : 'Genel, profesyonel ve dostane bir yanıt yaz.';

    const prompt = `
      Sen WhatsApp üzerinden iletişim kuran uzman bir B2B satış temsilcisisin.
      Müşteri (Lead) Bilgileri:
      - İşletme Adı: ${lead.businessName || lead.name}
      - Kategori: ${lead.category || 'Niteliksiz'}
      - Şehir: ${lead.city || 'Belirtilmemiş'}
      - Değerlendirme Puanı: ${lead.rating || 'Niteliksiz'}
      
      Son WhatsApp sohbet geçmişi:
      ${history}
      
      GÖREV:
      Bu işletmeye göndermek üzere yüksek dönüşüm oranına sahip, samimi, profesyonel ve kısa bir WhatsApp yanıtı tasarla.
      Yanıt tamamen TÜRKÇE olmalıdır.
      ${contextInstruction}
      
      KURALLAR:
      1. WhatsApp diline uygun, emojiler barındıran, çok resmi olmayan ama saygılı bir dil kullan.
      2. Çok kısa tut (maksimum 300 karakter).
      3. Dinamik değişken veya yer tutucu (örn: {businessName}, [Tarih]) asla bırakma, tüm metni gerçekçi bir şekilde doldur.
      4. Çift tırnak içerisine alma, sadece göndereceğimiz mesajın kendisini dön.
      
      Önerilen Yanıt:
    `;

    const result = await provider.generateText(prompt);
    return result.text.trim();
  }

  public async generateSequenceAIResponse(lead: any, lastMessage: string, aiPrompt: string): Promise<string> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');

    const prompt = `
      Sen bir B2B otomasyon asistanısın. Müşteri bir otomasyon dizisi içindeyken mesaj gönderdi.
      
      Müşteri Bilgileri:
      - Adı: ${lead.businessName || lead.name}
      - Kategori: ${lead.category || 'Belirtilmemiş'}
      
      AI Talimatların (Önemli):
      "${aiPrompt || 'Nazik ve profesyonel ol, randevu almaya çalış.'}"
      
      Müşterinin son mesajı:
      "${lastMessage}"
      
      GÖREV:
      Bu mesaja yukarıdaki talimatların doğrultusunda, profesyonel, yardımsever ve kısa bir yanıt yaz. 
      WhatsApp formatına uygun olsun. Sadece mesajın kendisini dön.
    `;

    const result = await provider.generateText(prompt);
    return result.text.trim();
  }

  public async processSmartAIFilter(userPrompt: string): Promise<any> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) throw new Error('No AI provider configured');

    const prompt = `
      Sen ArvexaLabs dijital büyüme partneri şirketinin gelişmiş yapay zeka satış mühendisisin.
      ArvexaLabs, Antalya merkezli, klasik web tasarım ajansı olmanın ötesinde "büyüme partneri" olarak işletmelere yüksek dönüşümlü web siteleri (satış makineleri), 7/24 yapay zeka destekli otomatik yanıt sistemleri ve özel yönetim panelleri kuran yenilikçi bir teknoloji firmasıdır.

      ARVEXALABS HAZIR PAKETLERİ (Şirketimize en çok para kazandıracak ürünler):
      1. Modern Kurumsal V1 (₺5.900) - Multi-page, CMS panel, SEO. Target: Genel kurumsal ofisler, klinikler, şirketler.
      2. E-Ticaret Starter (₺9.900) - Ödeme entegrasyonu, stok takibi, üye paneli. Target: Butikler, giyim mağazaları, yerel dükkanlar.
      3. Diş Hekimi Özel (₺7.500) - Online Randevu, hizmet sayfaları, mobil uyum. Target: Diş hekimleri, diş klinikleri.
      4. Avukat & Hukuk (₺7.500) - Prestijli görünüm, makale modülü, danışmanlık formu. Target: Hukuk büroları, avukatlar.
      5. Diyetisyen & Blog (₺6.900) - VKI hesaplayıcı, blog sistemi, form yönetimi. Target: Diyetisyenler, sağlıklı yaşam merkezleri.
      6. Güzellik Merkezi (₺8.500) - Galeri, hizmet kartları, Instagram feed. Target: Güzellik salonları, kuaförler, estetik merkezleri.
      7. Emlak Portalı (₺12.900) - Gelişmiş filtreleme, harita entegrasyonu, ilan paneli. Target: Emlak ofisleri, gayrimenkul danışmanları.
      8. Restoran & QR Menü (₺6.500) - Online menü, rezervasyon, konum bazlı. Target: Restoranlar, kafeler, pastaneler.
      9. Oto Galeri (₺9.500) - Araç karşılaştırma, teknik detaylar, WhatsApp teklif. Target: Oto galeriler, araba showroomları.
      10. Mimarlık Portfolyo (₺10.500) - Full-width galeri, proje detayları, minimal tasarım. Target: Mimarlık ofisleri, iç mimarlar.
      11. Eğitim & Kurs (₺11.900) - Eğitmen paneli, ders yönetimi, sertifika modülü. Target: Özel kurslar, dil okulları, özel öğretmenler.
      12. Spor Salonu & Gym (₺7.900) - Program kartları, eğitmen tanıtımı, üyelik formları. Target: Spor salonları, pilates stüdyoları.
      13. Dernek & Vakıf (₺5.500) - Bağış entegrasyonu, etkinlik takvimi, duyurular. Target: Sivil toplum kuruluşları, dernekler, vakıflar.
      14. Haber & Portal (₺6.900) - Kategori yönetimi, reklam alanları, anlık bildirim. Target: Yerel haber siteleri, blog portalları.
      15. Kişisel CV & Portfolio (₺5.000) - Deneyim zaman çizgesi, beceri barları, PDF indirme. Target: Bireysel profesyoneller, doktorlar, sanatçılar.
      16. Lojistik & Nakliye (₺8.900) - Teklif al formu, takip sistemi, hizmet haritası. Target: Nakliyat, kargo, lojistik firmaları.
      17. Temizlik Hizmetleri (₺5.900) - Hizmet paketleri, bölge seçimi, hızlı rezervasyon. Target: Temizlik şirketleri, koltuk yıkama firmaları.
      18. Düğün & Etkinlik (₺7.500) - Geri sayım sayacı, Lale/Lcv formu, fotoğraf galerisi. Target: Düğün salonları, organizasyon şirketleri.
      19. Pet Shop & Veteriner (₺7.900) - Ürün katalogu, randevu sistemi, blog yazıları. Target: Veteriner klinikleri, pet shoplar.
      20. Teknik Servis (₺8.500) - Arıza formu, marka/model seçimi, süreç takibi. Target: Beyaz eşya servisi, telefon/bilgisayar tamiri, kombi servisi.

      GÖREV:
      Kullanıcı doğal dilde bir müşteri arama veya para kazanma fırsatı ("Antalya'da web sitesi olmayan diş hekimleri", "satış yapabileceğimiz oto galeriler", "en çok para kazandıracak güzellik merkezleri" vb.) sorguladı.
      Bu sorguyu analiz etmeli ve veritabanı filtrelerine dönüştürmelisin. Ayrıca bu filtreyle eşleşen müşterilere hangi Arvexa hazır paketini, nasıl satabileceğimizi (satış stratejisini) açıklamalısın.

      Yanıt formatı kesinlikle saf JSON olmalıdır ve başka açıklama içermemelidir:
      {
        "matchedPackageName": "Eşleşen Paket İsmi (Örn: Diş Hekimi Özel)",
        "matchedPackagePrice": "₺7.500",
        "marketingStrategy": "Bu müşteriler için en doğru satış yaklaşımı, randevu sistemini vurgulamak...",
        "mongoFilters": {
          "category": "Google Maps kategori kelimesi (Örn: 'Diş Hekimi' veya 'Oto Galeri'). İngilizce veya Türkçe arama eşleşmesini gözet.",
          "hasWebsite": "true" | "false" | "all",
          "hasPhone": "true" | "false" | "all",
          "city": "Şehir ismi (Örn: 'Antalya')",
          "minRating": number | null,
          "maxRating": number | null,
          "search": "Serbest arama kelimesi veya null"
        }
      }

      Kullanıcı Sorgusu: "${userPrompt}"
    `;

    const result = await provider.generateText(prompt);
    try {
      const match = result.text.match(/\{.*\}/s);
      if (!match) throw new Error('Invalid JSON response from AI');
      return JSON.parse(match[0]);
    } catch (err) {
      console.error('Failed to parse AI response:', result.text, err);
      return {
        matchedPackageName: 'Modern Kurumsal V1',
        matchedPackagePrice: '₺5.900',
        marketingStrategy: 'Kullanıcı sorgusu işlenirken hata oluştu, varsayılan kurumsal filtre uygulandı.',
        mongoFilters: {
          search: userPrompt,
          hasWebsite: 'all',
          hasPhone: 'all'
        }
      };
    }
  }
}

export const aiService = new AIService();