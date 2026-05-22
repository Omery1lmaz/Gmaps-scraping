import { motion } from "framer-motion";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient?: string;
  previewData?: {
    labels: string[];
    values: number[];
  };
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  gradient = "from-primary/5 to-primary/10",
  previewData,
  className = "",
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative overflow-hidden flex flex-col items-start rounded-2xl
        border border-border/50 bg-card/80 backdrop-blur-sm p-6
        transition-all duration-300 hover:shadow-lg hover:-translate-y-1
        ${className}
      `}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-primary/5 pointer-events-none" />
      
      <div className="relative z-10 flex-1 w-full space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-secondary">{title}</h3>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground">{description}</p>
        
        {/* Preview Chart (if data provided) */}
        {previewData && (
          <div className="h-10 w-full bg-muted/20 rounded overflow-hidden relative">
            <div 
              className="absolute inset-0"
              style={{ 
                background: `linear-gradient(90deg, ${gradient.replace('/5', '/20').replace('/10', '/40')})`, 
                width: `${(previewData.values.slice(-1)[0] / Math.max(...previewData.values)) * 100}%` 
              }}
            />
          </div>
        )}
        
        {/* Stats Bar */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
          <div className="flex-1 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-primary rounded-full" />
              <span className="text-xs text-muted-foreground">Active Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-primary/50 rounded-full" />
              <span className="text-xs text-muted-foreground">2.4k Today</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center">
              <svg className="h-2 w-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};