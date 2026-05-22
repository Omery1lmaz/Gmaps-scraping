import { motion } from "framer-motion";

interface PricingCardProps {
  name: string;
  price: {
    monthly: number;
    annual: number;
  };
  features: string[];
  popular: boolean;
  savings: string;
  billing: "monthly" | "annual";
  className?: string;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  features,
  popular,
  savings,
  billing,
  className = "",
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative flex flex-col items-stretch rounded-xl border border-gray-100
        bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:-translate-y-1
        transition-all duration-300 ${popular ? 'border-indigo-200 bg-indigo-50' : ''}
        ${className}
      `}
    >
      {popular && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center px-4 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
          Popular
        </div>
      )}

      <div className="p-6 sm:p-8 flex-1 w-full">
        <h3 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {name}
        </h3>
        <div className="mb-4 flex items-baseline">
          <span className="block text-3xl font-bold text-gray-900">
            ${billing === 'annual' ? price.annual : price.monthly}
          </span>
          <span className="ml-3 text-sm text-gray-500">
            /{billing === 'annual' ? 'yr' : 'mo'}
          </span>
        </div>
        {billing === 'annual' && (
          <div className="mb-4 text-sm text-indigo-600 bg-indigo-50 px-3 py-2 rounded">
            {savings}
          </div>
        )}

        <ul className="space-y-3 mb-6 flex-1">
          {features.map((feature, idx) => (
            <motion.li
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex items-center space-x-3 text-sm text-gray-600"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.128.144l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </motion.li>
          ))}
        </ul>

        <button
          className={`
            w-full flex items-center justify-center px-4 py-2 text-sm font-medium
            transition-colors duration-200 ${popular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }
            rounded-lg
          `}
        >
          {popular ? 'Get Started' : 'Choose Plan'}
        </button>
      </div>
    </motion.div>
  );
};