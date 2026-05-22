export const translations = {
  en: {
    navbar: {
      features: 'Features',
      howItWorks: 'How it Works',
      pricing: 'Pricing',
      faq: 'FAQ',
      cta: 'Get Extension'
    },
    hero: {
      liveScraper: 'Live Manifest V3 Scraper',
      activeState: 'EXTENSION ACTIVE',
      title: 'Turn Google Maps Businesses Into',
      titleHighlight: 'WhatsApp Customers',
      desc: 'Extract B2B contact details from Google Maps with one click, enrich them using AI model insights, and automatically launch WhatsApp outreach campaigns.',
      ctaTrial: 'Start Free Trial',
      ctaDemo: 'Book a Demo',
      statRating: 'Google Maps Rating parser',
      statDelivery: 'WhatsApp Delivery Success',
      statPersonalized: 'AI Personalization Rate',
      simSearch: 'google.com/maps/search/dentists...',
      simLogScraped: '📍 Scraped: "{name}" from Google Maps',
      simLogPhone: '📞 Extracted Phone: +1 312-555-{num}',
      simLogAnalyze: '🤖 AI: Analyzing business category & reviews...',
      simLogIntro: '✨ Generated intro: "Hi {name} team! Love your 4.8★ reviews..."',
      simLogOutreach: '💬 Sending personalized WhatsApp outreach...',
      simLogSuccess: '✅ Outreach delivered to WhatsApp Queue successfully!'
    },
    socialProof: {
      title: 'Trusted by Lead Generation Teams at Scaling Companies'
    },
    problem: {
      badge: 'The Outreach Challenge',
      title: 'Traditional B2B Cold Outreach is',
      titleHighlight: 'Slow and Broken',
      desc: 'Stop wasting hours copy-pasting numbers, writing generic emails that go to spam, or getting ignored on cold channels.',
      cards: [
        {
          title: 'Manual Google Maps Crawling',
          desc: 'Wasting hours extracting business names, phone numbers, and websites manually. It is slow and prone to human errors.'
        },
        {
          title: 'Cold Outreach Ignored',
          desc: 'Cold emails get filtered to spam. Unpersonalized templates get deleted instantly. Out of 100 leads, you get zero replies.'
        },
        {
          title: 'Disconnected Workflows',
          desc: 'Using one tool to scrape, another for AI writing, and a third for outreach. Leads get lost in manual file transfers.'
        },
        {
          title: 'Account Bans & Low ROI',
          desc: 'Violating limits or triggering automated spam blocks on WhatsApp. High costs, low conversions, wasted campaigns.'
        }
      ]
    },
    solution: {
      badge: 'The Modern Workflow',
      title: 'All-in-One Automated B2B',
      titleHighlight: 'Growth Engine',
      desc: 'WPAIFlow unifies lead extraction, AI copywriting, and WhatsApp outreach in a single browser-native command center.',
      headers: ['Capability', 'Manual Scraping', 'WPAIFlow'],
      items: [
        { name: 'Lead Extraction Speed', manual: 'Slow, 3 mins/lead', custom: 'Ultra Fast, 60+ leads/min' },
        { name: 'AI Copywriter Personalization', manual: 'None (Generic Templates)', custom: 'GPT-4 & Claude Deep Reviews Review' },
        { name: 'Outreach Channel Success', manual: 'Cold Email (1-3% Open)', custom: 'WhatsApp Web (90%+ Open Rate)' },
        { name: 'Deduplication & Storage', manual: 'Manual CSVs (Duplicates)', custom: 'Auto API Sync & External ID filtering' },
        { name: 'Workflows & Integration', manual: 'Fragmented Excel Sheets', custom: 'One-Click Automated Campaign Queue' }
      ]
    },
    features: {
      title: 'Outreach Capabilities Built to',
      titleHighlight: 'Accelerate Growth',
      desc: 'Supercharge your B2B lead generation with the exact toolset native to our B2B dashboard app.',
      items: [
        {
          title: 'GMaps Extract Engine',
          desc: 'Scrape business names, reviews, ratings, phone numbers, and websites from Maps listings with our Manifest V3 Extension.'
        },
        {
          title: 'Visual Sequence Builder',
          desc: 'Design drag-and-drop outreach flows with custom delay steps, conditions, and automated follow-ups.'
        },
        {
          title: 'AI Message Templates',
          desc: 'Define system prompts utilizing Gmaps merge tags to write customized B2B introduction hooks at scale.'
        },
        {
          title: 'WhatsApp Session Manager',
          desc: 'Authenticate multiple active WhatsApp accounts using QR code scan to orchestrate local campaign queues.'
        },
        {
          title: 'Unified Reply Inbox',
          desc: 'Intercept incoming responses and converse with hot prospects in real time directly from the central inbox.'
        },
        {
          title: 'CRM Deals Pipeline',
          desc: 'Organize prospects through custom sales stages—from initial contact to booked demo and closed deal.'
        }
      ]
    },
    howItWorks: {
      title: 'Set Up Automated Outreach in',
      titleHighlight: 'Three Steps',
      desc: 'Go from searching Google Maps to launching custom WhatsApp sequences in minutes.',
      steps: [
        {
          id: 0,
          badge: 'Phase 1',
          title: 'Extract Gmaps Leads',
          desc: 'Run our Chrome Extension, enter a target niche (e.g. "Dentists in Chicago"), and scan. Leads sync automatically to your dashboard Leads page with zero duplicates.',
          screenTitle: 'Google Maps Extractor',
          screenInputPlaceholder: 'Dentists in Chicago',
          screenBtnText: 'Extract 128 Leads'
        },
        {
          id: 1,
          badge: 'Phase 2',
          title: 'Design Sequence & Templates',
          desc: 'Build outreach campaigns inside the Visual Builder. Create AI message templates that dynamically pull rating score and business name.',
          screenTitle: 'Visual Sequence Builder',
          screenInputPlaceholder: 'Define campaign flow...',
          screenBtnText: 'Save Sequence Pipeline'
        },
        {
          id: 2,
          badge: 'Phase 3',
          title: 'Link WhatsApp & Automate',
          desc: 'Scan the QR code in the WhatsApp Manager to link your accounts. The Node.js automation queue sends campaigns with human-like delays.',
          screenTitle: 'WhatsApp Account Manager',
          screenInputPlaceholder: 'Scan session QR...',
          screenBtnText: 'Start Outreach Flow'
        }
      ]
    },
    productPreview: {
      title: 'Designed to Feel Premium,',
      titleHighlight: 'Built to Perform',
      desc: 'A gorgeous frontend console displaying everything you need to run high-volume lead pipelines.',
      tabs: {
        leads: 'Leads Manager',
        ai: 'Visual Builder',
        analytics: 'WhatsApp Sessions'
      },
      leadsTable: {
        title: 'Leads Database (LeadsPage)',
        searchPlaceholder: 'Search leads...',
        colName: 'Business Name',
        colCategory: 'Category',
        colRating: 'Rating',
        colPhone: 'Phone',
        colStatus: 'Outreach Status',
        badgeSynced: 'Synced',
        badgeSending: 'Sending',
        badgeQueued: 'Queued'
      },
      aiModel: {
        title: 'Visual Campaign Builder (SequenceBuilder)',
        promptLabel: 'SEQUENCE STAGES DIAGRAM',
        variablesLabel: 'CAMPAIGN STAGES',
        outputLabel: 'SEQUENCE FLOW'
      },
      analyticsPreview: {
        title: 'WhatsApp Session Manager (WhatsAppPage)',
        scraped: 'Linked Sessions',
        enriched: 'Messages Sent',
        delivered: 'Delivery Rate',
        replied: 'Avg Response'
      }
    },
    integrations: {
      title: 'Plays Nicely with Your',
      titleHighlight: 'Existing Stack',
      desc: 'Seamlessly sync B2B leads to databases, trigger automated webhooks, or push contact details straight to your sales team.',
      centralNode: 'LeadFlow Engine'
    },
    analytics: {
      title: 'Real Results,',
      titleHighlight: 'Real Outreach Analytics',
      desc: 'Monitor campaigns, filter duplicates, and optimize WhatsApp queues with our integrated analytics reporting system.',
      avgReply: 'Average Reply Rate',
      leadsToday: 'Leads Scraped Today',
      deliverySuccess: 'Delivery Success Rate',
      roiBoost: 'Conversion ROI Boost',
      chartTitle: 'Daily Conversions Performance',
      chartDesc: 'Average weekly responses synced to client dashboard',
      chartWeekGlow: '+32.4% Week-on-Week',
      funnelTitle: 'Outreach Pipeline Funnel',
      funnelDesc: 'Visual conversion stats for the current campaign run'
    },
    pricing: {
      title: 'Flexible, Simple',
      titleHighlight: 'Pricing Plans',
      desc: 'Choose the plan that matches your volume. Pick a plan built for your growth stage.',
      monthlyBilling: 'Monthly billing',
      annualBilling: 'Annual billing',
      save: 'SAVE UP TO 25%',
      plans: [
        {
          name: 'Free',
          priceMonthly: '0',
          priceAnnual: '0',
          currency: '$',
          description: 'Explore the workflow and preview the LeadFlow dashboard.',
          cta: 'Start Exploring Free',
          features: [
            'Scrape 50 leads total (demo limit)',
            'Basic Chrome Extension access',
            'Local storage only (no cloud sync)',
            'Export up to 10 leads to CSV/JSON',
            'Send up to 5 test WhatsApp messages'
          ]
        },
        {
          name: 'Starter',
          priceMonthly: '19',
          priceAnnual: '15',
          currency: '$',
          description: 'For solo operators transitioning to automated outreach.',
          cta: 'Launch Starter Plan',
          features: [
            'Scrape 1,000 leads / month',
            'Full Chrome Extension access',
            'Cloud sync & lead management',
            'Unlimited CSV/JSON exports',
            '1 connected WhatsApp session',
            'Bulk messaging with smart delays',
            '100 AI personalization credits / mo',
            'Standard email support'
          ]
        },
        {
          name: 'Growth',
          priceMonthly: '49',
          priceAnnual: '39',
          currency: '$',
          description: 'For scaling outreach teams needing advanced campaigns.',
          cta: 'Scale with Growth',
          features: [
            'Scrape 5,000 leads / month',
            '3 connected WhatsApp sessions',
            'Automated follow-up sequences',
            '1,000 AI credits / month',
            'Up to 3 team members',
            'Anti-ban protection & proxy support',
            'Priority email & chat support'
          ]
        },
        {
          name: 'Agency',
          priceMonthly: '129',
          priceAnnual: '99',
          currency: '$',
          description: 'For high-volume outreach agencies managing clients.',
          cta: 'Get Agency Power',
          features: [
            'Scrape 25,000 leads / month',
            '10 connected WhatsApp sessions',
            'Unlimited sequence steps & follow-ups',
            '5,000 AI credits / month',
            'Unlimited team members & roles',
            'Multi-workspace client management',
            'Partial white-label client reports',
            'Dedicated 1-on-1 account manager'
          ]
        }
      ]
    },
    testimonials: {
      title: 'What Growth Marketers Say About',
      titleHighlight: 'WPAIFlow',
      desc: 'Join thousands of growth hackers and sales reps scale their outreach pipeline without manual labor.',
      items: [
        {
          name: 'Sarah Jenkins',
          role: 'Founder at LeadLaunch Agency',
          text: 'Scraping used to take us hours. Now we just set the search term, extract 500 leads in under 10 minutes, and push them to WhatsApp queue. Response rates jumped from 2% to 22%!'
        },
        {
          name: 'Mehmet Yılmaz',
          role: 'B2B Sales Lead at GrowthCo',
          text: 'The AI reviews analysis is mind-blowing. It references specific reviews left on their Gmaps listing! Prospects genuinely think we typed the messages manually.'
        },
        {
          name: 'David Chen',
          role: 'Freelance Marketer',
          text: 'Extremely simple to use. WhatsApp Web integration is perfect, allowing us to send direct campaigns withoutpaying high meta API prices. Highly recommend!'
        }
      ]
    },
    faq: {
      badge: 'Common Queries',
      title: 'Frequently Asked',
      titleHighlight: 'Questions',
      desc: 'Got questions? We have answers. If you need custom help, reach out to our team.',
      items: [
        {
          q: 'Does it require a WhatsApp Business API key?',
          a: 'No. WPAIFlow runs directly inside your browser window through WhatsApp Web, meaning you do not need expensive Meta API keys or pre-approved templates.'
        },
        {
          q: 'How many business leads can I scrape per day?',
          a: 'There are no strict limits on the extension level, but we recommend staying within our recommended delays (1.5s - 2.5s per business) to comply with Google search limits.'
        },
        {
          q: 'Will my WhatsApp account get banned?',
          a: 'To protect your account, we enforce random human-like typing delays (3000ms - 8000ms) between messages. We also recommend starting campaigns with existing warm clients.'
        },
        {
          q: 'Can I export leads to Excel/CSV?',
          a: 'Yes, absolutely. You can download leads in raw JSON or formatted CSV format directly from the extension popup or sync them to our database backend.'
        }
      ]
    },
    finalCta: {
      title: 'Ready to Automate Your',
      titleHighlight: 'Outreach Engine?',
      desc: 'Get access to WPAIFlow today. Download the Chrome Extension and start getting WhatsApp clients in minutes.',
      ctaStart: 'Get Started Free',
      ctaDocs: 'Read Documentation'
    },
    footer: {
      desc: 'Automate your lead generation and WhatsApp outreach with AI-powered precision.',
      product: 'Product',
      resources: 'Resources',
      company: 'Company',
      social: 'Social'
    }
  },
  tr: {
    navbar: {
      features: 'Özellikler',
      howItWorks: 'Nasıl Çalışır',
      pricing: 'Fiyatlandırma',
      faq: 'SSS',
      cta: 'Eklentiyi Edinin'
    },
    hero: {
      liveScraper: 'Canlı Manifest V3 Eklentisi',
      activeState: 'EKLENTİ AKTİF',
      title: 'Google Haritalar Kayıtlarını',
      titleHighlight: 'WhatsApp Müşterisine Dönüştürün',
      desc: 'Google Haritalar\'dan tek tıkla B2B iletişim bilgilerini çekin, yapay zeka ile kişiselleştirin ve otomatik WhatsApp sosyal yardım kampanyaları başlatın.',
      ctaTrial: 'Ücretsiz Deneyin',
      ctaDemo: 'Demo Randevusu',
      statRating: 'Harita Puanı Analiz Hızı',
      statDelivery: 'WhatsApp Teslimat Başarısı',
      statPersonalized: 'Yapay Zeka Kişiselleştirme',
      simSearch: 'google.com/maps/search/dentists...',
      simLogScraped: '📍 Çekildi: Google Haritalar\'dan "{name}"',
      simLogPhone: '📞 Telefon Çekildi: +90 532-555-{num}',
      simLogAnalyze: '🤖 AI: İşletme kategorisi ve yorumları analiz ediliyor...',
      simLogIntro: '✨ Giriş metni oluşturuldu: "Merhaba {name} ekibi! 4.8★ yorumlarınızı çok beğendik..."',
      simLogOutreach: '💬 Kişiselleştirilmiş WhatsApp mesajı gönderiliyor...',
      simLogSuccess: '✅ Sosyal yardım başarıyla WhatsApp kuyruğuna iletildi!'
    },
    socialProof: {
      title: 'Büyüyen Şirketlerdeki Lead Generation Ekiplerinin Güvendiği Platform'
    },
    problem: {
      badge: 'Sosyal Yardım Sorunu',
      title: 'Geleneksel B2B Cold Outreach',
      titleHighlight: 'Yavaş ve Verimsiz',
      desc: 'Saatlerce numara kopyalayıp yapıştırmayı, spama düşen jenerik e-postalar yazmayı veya soğuk aramalarda reddedilmeyi bırakın.',
      cards: [
        {
          title: 'Manuel Google Haritalar Taraması',
          desc: 'İşletme adlarını, telefon numaralarını ve web sitelerini manuel olarak kopyalayarak saatlerinizi harcamak. Yavaş ve hataya açıktır.'
        },
        {
          title: 'Yanıt Alınamayan Mesajlar',
          desc: 'Soğuk e-postalar spama takılır. Kişiselleştirilmemiş şablonlar anında silinir. 100 potansiyel müşteriden sıfır geri dönüş alırsınız.'
        },
        {
          title: 'Kopuk İş Akışları',
          desc: 'Veri çekmek için bir araç, yapay zeka yazımı için başka bir araç ve mesaj göndermek için üçüncü bir araç kullanmak. Veriler kaybolur.'
        },
        {
          title: 'Hesap Engelleri ve Düşük Getiri',
          desc: 'Sınırları aşma veya WhatsApp\'ta otomatik spam engellemelerini tetikleme. Yüksek maliyetler, düşük dönüşümler.'
        }
      ]
    },
    solution: {
      badge: 'Modern İş Akışı',
      title: 'Hepsi Bir Arada Otomatik B2B',
      titleHighlight: 'Büyüme Motoru',
      desc: 'WPAIFlow, veri çekmeyi, yapay zeka içerik yazımını ve WhatsApp mesaj gönderimini tek bir tarayıcı tabanlı panelde birleştirir.',
      headers: ['Yetenek', 'Manuel Tarama', 'WPAIFlow'],
      items: [
        { name: 'Veri Çekme Hızı', manual: 'Yavaş, 3 dk/müşteri', custom: 'Ultra Hızlı, 60+ kayıt/dk' },
        { name: 'Yapay Zeka Kişiselleştirme', manual: 'Yok (Sıradan Şablonlar)', custom: 'GPT-4 & Claude ile Detaylı Yorum Analizi' },
        { name: 'Mesaj Kanalı Başarısı', manual: 'Soğuk E-posta (%1-3 Açılma)', custom: 'WhatsApp Web (%90+ Açılma Oranı)' },
        { name: 'Kopya Veri Filtreleme', manual: 'Manuel Excel Kontrolü', custom: 'Otomatik API Senkronizasyonu & Benzersiz ID Filtresi' },
        { name: 'İş Akışları & Entegrasyon', manual: 'Kopuk Excel Dosyaları', custom: 'Tek Tıkla Otomatik WhatsApp Kuyruğu' }
      ]
    },
    features: {
      title: 'Hızlı Büyümeniz İçin Tasarlanan',
      titleHighlight: 'Kapsamlı Özellikler',
      desc: 'B2B kontrol panelimizde bulunan gerçek ve entegre uygulamalarla müşteri kazanım süreçlerinizi saniyeler içinde otomatikleştirin.',
      items: [
        {
          title: 'GMaps Çıkarma Motoru',
          desc: 'Manifest V3 eklentimizi kullanarak Google Haritalar arama sonuçlarından işletme adlarını, telefonları, puanları ve web sitelerini toplayın.'
        },
        {
          title: 'Görsel Kampanya Sihirbazı',
          desc: 'Sürükle-bırak adımlarla mesajlaşma serileri oluşturun, bekleme süreleri tanımlayın ve otomatik takip mesajları ekleyin.'
        },
        {
          title: 'Yapay Zeka Şablonları',
          desc: 'Yorumları ve işletme puanlarını otomatik okuyan prompt şablonları hazırlayarak sosyal yardım mesajlarınızı ölçekli kişiselleştirin.'
        },
        {
          title: 'WhatsApp Oturum Yönetimi',
          desc: 'Tarayıcı motorumuz üzerinden QR kod ile birden fazla WhatsApp hesabı bağlayın ve kuyrukları yerel olarak yönetin.'
        },
        {
          title: 'Ortak Gelen Kutusu',
          desc: 'Gelen yanıtları anlık olarak takip edin ve ilgilenen sıcak müşteri adaylarıyla doğrudan panelden sohbete başlayın.'
        },
        {
          title: 'CRM Satış Hunisi',
          desc: 'Potansiyel müşterilerinizi ilk temastan kazanılan satış aşamasına kadar özelleştirilmiş CRM sütunlarında sürükleyip yönetin.'
        }
      ]
    },
    howItWorks: {
      title: '3 Basit Adımda Otomatik',
      titleHighlight: 'Sosyal Yardım Kurulumu',
      desc: 'Google Haritalar aramasından kişiselleştirilmiş WhatsApp mesajları göndermeye dakikalar içinde geçin.',
      steps: [
        {
          id: 0,
          badge: 'Aşama 1',
          title: 'Harita Verilerini Çekin',
          desc: 'Chrome Eklentimizi açın, hedef arama terimini girin (örn. "İstanbul Diş Hekimleri") ve taratın. Çekilen veriler mükerrersiz olarak Leads sayfanıza senkronize olur.',
          screenTitle: 'Google Haritalar Tarayıcı',
          screenInputPlaceholder: 'İstanbul Diş Hekimleri',
          screenBtnText: '128 Kayıt Çek'
        },
        {
          id: 1,
          badge: 'Aşama 2',
          title: 'Kampanya Akışı & Şablonu',
          desc: 'Görsel Kampanya Sihirbazı ile akışınızı tasarlayın. İşletme adı ve harita puanlarını otomatik yerleştiren yapay zeka şablonları tanımlayın.',
          screenTitle: 'Görsel Kampanya Sihirbazı',
          screenInputPlaceholder: 'Kampanya akışını tanımlayın...',
          screenBtnText: 'Akışı Kaydet'
        },
        {
          id: 2,
          badge: 'Aşama 3',
          title: 'WhatsApp Bağlayın & Otomatikleştirin',
          desc: 'WhatsApp Yöneticisi panelindeki QR kodu taratarak hesaplarınızı bağlayın. Arka plan Node.js kuyruk motorumuz mesajları güvenli aralıklarla iletsin.',
          screenTitle: 'WhatsApp Oturum Yönetimi',
          screenInputPlaceholder: 'QR Kodu taratın...',
          screenBtnText: 'Kampanyayı Başlat'
        }
      ]
    },
    productPreview: {
      title: 'Üst Düzey Tasarım,',
      titleHighlight: 'Yüksek Performans',
      desc: 'Geniş ölçekli müşteri kazanım süreçlerini yönetmek için ihtiyacınız olan her şeyi sunan göz alıcı bir arayüz.',
      tabs: {
        leads: 'Müşteri Yönetimi',
        ai: 'Görsel Sihirbaz',
        analytics: 'WhatsApp Oturumları'
      },
      leadsTable: {
        title: 'Müşteri Yönetim Paneli (LeadsPage)',
        searchPlaceholder: 'Müşterilerde ara...',
        colName: 'İşletme Adı',
        colCategory: 'Kategori',
        colRating: 'Değerlendirme',
        colPhone: 'Telefon',
        colStatus: 'İletişim Durumu',
        badgeSynced: 'Eşlendi',
        badgeSending: 'Gönderiliyor',
        badgeQueued: 'Kuyrukta'
      },
      aiModel: {
        title: 'Görsel Kampanya Sihirbazı (SequenceBuilder)',
        promptLabel: 'KAMPANYA ADIMLARI ŞEMASI',
        variablesLabel: 'KAMPANYA AŞAMALARI',
        outputLabel: 'SEQUENCE AKIŞI'
      },
      analyticsPreview: {
        title: 'WhatsApp Oturum Yönetimi (WhatsAppPage)',
        scraped: 'Bağlı Hesap',
        enriched: 'Gönderilen Mesaj',
        delivered: 'İletim Başarısı',
        replied: 'Ort. Yanıt Oranı'
      }
    },
    integrations: {
      title: 'Mevcut Araçlarınızla',
      titleHighlight: 'Uyum İçinde Çalışır',
      desc: 'Potansiyel B2B müşterilerinizi veritabanınıza senkronize edin, otomatik webhook\'ları tetikleyin veya doğrudan satış ekibinize yönlendirin.',
      centralNode: 'LeadFlow Motoru'
    },
    analytics: {
      title: 'Gerçek Sonuçlar,',
      titleHighlight: 'Gerçek Kampanya Analizleri',
      desc: 'Entegre analiz raporlama sistemimizle kampanyaları izleyin, yinelenen verileri filtreleyin ve WhatsApp kuyruklarını optimize edin.',
      avgReply: 'Ortalama Yanıt Oranı',
      leadsToday: 'Bugün Çekilen Kayıt',
      deliverySuccess: 'Teslimat Başarı Oranı',
      roiBoost: 'Yatırım Dönüşü (ROI)',
      chartTitle: 'Günlük Dönüşüm Performansı',
      chartDesc: 'Kullanıcı paneline senkronize edilen haftalık ortalama yanıtlar',
      chartWeekGlow: 'Haftalık +%32.4 Artış',
      funnelTitle: 'Kampanya Dönüşüm Hunisi',
      funnelDesc: 'Mevcut kampanya yürütmesindeki görsel dönüşüm oranları'
    },
    pricing: {
      title: 'Esnek ve Şeffaf',
      titleHighlight: 'Fiyatlandırma Planları',
      desc: 'Hacminize en uygun planı seçin. Büyüme hedeflerinize en uygun planı belirleyin.',
      monthlyBilling: 'Aylık ödeme',
      annualBilling: 'Yıllık ödeme',
      save: '%25\'E VARAN TASARRUF',
      plans: [
        {
          name: 'Free (Ücretsiz)',
          priceMonthly: '0',
          priceAnnual: '0',
          currency: '₺',
          description: 'İş akışını keşfedin ve LeadFlow yönetim panelini inceleyin.',
          cta: 'Ücretsiz Keşfetmeye Başla',
          features: [
            'Maksimum 50 Harita kaydı çekme (deneme limiti)',
            'Chrome Eklentisi erişimi (temel görünüm)',
            'Yalnızca yerel depolama (bulut eşleme yok)',
            'CSV/JSON olarak maks. 10 kayıt aktarma',
            'Maksimum 5 adet manuel test WhatsApp mesajı'
          ]
        },
        {
          name: 'Starter (Başlangıç)',
          priceMonthly: '299',
          priceAnnual: '249',
          currency: '₺',
          description: 'Sosyal yardım süreçlerini otomatikleştirmek isteyen bireysel kullanıcılar için.',
          cta: 'Starter Planı Başlat',
          features: [
            'Aylık 1.000 adet veri çekimi',
            'Chrome Eklentisi erişimi (tam yetki)',
            'Bulut senkronizasyonu ve müşteri yönetimi',
            'Sınırsız CSV/JSON çıktısı alma',
            '1 adet bağlı WhatsApp hesabı',
            'Akıllı bekleme süreleriyle toplu mesaj',
            'Aylık 100 AI kişiselleştirilmiş giriş kredisi',
            'Standart e-posta desteği'
          ]
        },
        {
          name: 'Growth (Büyüme)',
          priceMonthly: '699',
          priceAnnual: '579',
          currency: '₺',
          description: 'Otomatik takip ve çoklu hesap yönetimine ihtiyaç duyan ekipler için.',
          cta: 'Growth ile Ölçekle',
          features: [
            'Aylık 5.000 adet veri çekimi',
            '3 adet bağlı WhatsApp hesabı',
            'Çok adımlı otomatik takip serileri',
            'Aylık 1.000 AI kişiselleştirme kredisi',
            '3 adede kadar ekip üyesi yönetimi',
            'Spam engelleme koruması ve proxy desteği',
            'Öncelikli e-posta ve canlı destek'
          ]
        },
        {
          name: 'Agency (Ajans)',
          priceMonthly: '1799',
          priceAnnual: '1499',
          currency: '₺',
          description: 'Müşteri hesaplarını ayrı çalışma alanlarında yöneten büyük ekipler için.',
          cta: 'Ajans Gücünü Edinin',
          features: [
            'Aylık 25.000 adet veri çekimi',
            '10 adet bağlı WhatsApp hesabı',
            'Sınırsız çok adımlı takip serisi',
            'Aylık 5.000 AI kişiselleştirme kredisi',
            'Sınırsız ekip üyesi ve rol yönetimi',
            'Çoklu çalışma alanı (bağımsız veri yönetimi)',
            'Kısmi white-label müşteri raporları',
            'Bire bir özel müşteri başarı yöneticisi'
          ]
        }
      ]
    },
    testimonials: {
      title: 'Büyüme Odaklı Markaların',
      titleHighlight: 'WPAIFlow Yorumları',
      desc: 'İletişim süreçlerini manuel iş gücü olmadan büyüten binlerce satış temsilcisine ve büyüme uzmanına katılın.',
      items: [
        {
          name: 'Sarah Jenkins',
          role: 'LeadLaunch Ajansı Kurucusu',
          text: 'Eskiden veri çekmek saatlerimizi alırdı. Artık sadece arama terimini giriyor, 10 dakikadan kısa sürede 500 veri çekiyor ve WhatsApp kuyruğuna atıyoruz. Yanıt oranlarımız %2\'den %22\'ye yükseldi!'
        },
        {
          name: 'Mehmet Yılmaz',
          role: 'GrowthCo Satış Lideri',
          text: 'Yapay zeka ile yorum analiz etme yeteneği inanılmaz. Google Haritalar kayıtlarındaki spesifik yorumlara atıfta bulunuyor! Müşteriler mesajları tamamen manuel yazdığımızı sanıyor.'
        },
        {
          name: 'David Chen',
          role: 'Serbest Çalışan Pazarlamacı',
          text: 'Kullanımı son derece basit. WhatsApp Web entegrasyonu harika; yüksek Meta API ücretleri ödemek zorunda kalmadan doğrudan kampanya yönetmemizi sağlıyor. Şiddetle tavsiye ederim!'
        }
      ]
    },
    faq: {
      badge: 'Sıkça Sorulanlar',
      title: 'Sıkça Sorulan',
      titleHighlight: 'Sorular',
      desc: 'Sorularınız mı var? Yanıtlarımız hazır. Özel yardıma ihtiyacınız olursa ekibimizle iletişime geçin.',
      items: [
        {
          q: 'WhatsApp Business API anahtarı gerekiyor mu?',
          a: 'Hayır. WPAIFlow doğrudan tarayıcınızda WhatsApp Web üzerinden çalışır; bu da pahalı Meta API anahtarlarına veya onaylı şablonlara ihtiyacınız olmadığı anlamına gelir.'
        },
        {
          q: 'Günde kaç adet potansiyel müşteri çekebilirim?',
          a: 'Eklenti tarafında katı bir sınır yoktur, ancak Google arama limitlerine uymak için önerilen gecikme sürelerinde (firma başına 1.5 sn - 2.5 sn) kalmanızı öneririz.'
        },
        {
          q: 'WhatsApp hesabımın engellenme riski var mı?',
          a: 'Hesap güvenliğiniz için mesajlar arasına rastgele insan benzeri yazma gecikmeleri (3 sn - 8 sn) uyguluyoruz. Ayrıca kampanyalara mevcut sıcak rehberinizle başlamanızı öneririz.'
        },
        {
          q: 'Verileri Excel/CSV olarak dışa aktarabilir miyim?',
          a: 'Evet, kesinlikle. Verilerinizi doğrudan eklenti pop-up penceresinden ham JSON veya biçimlendirilmiş CSV dosyası olarak indirebilir ya da veritabanımıza eşitleyebilirsiniz.'
        }
      ]
    },
    finalCta: {
      title: 'Müşteri Kazanım Süreçlerinizi',
      titleHighlight: 'Otomatikleştirmeye Hazır mısınız?',
      desc: 'WPAIFlow\'a bugün erişin. Chrome Eklentisini indirin ve dakikalar içinde WhatsApp üzerinden yeni müşteriler kazanmaya başlayın.',
      ctaStart: 'Ücretsiz Başlayın',
      ctaDocs: 'Belgeleri Okuyun'
    },
    footer: {
      desc: 'AI destekli hassasiyetle potansiyel müşteri yaratma ve WhatsApp sosyal yardım süreçlerinizi otomatikleştirin.',
      product: 'Ürün',
      resources: 'Kaynaklar',
      company: 'Şirket',
      social: 'Sosyal'
    }
  }
} as const;
