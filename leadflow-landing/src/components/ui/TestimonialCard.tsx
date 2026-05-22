import { motion } from "framer-motion";

interface TestimonialCardProps {
  name: string;
  title: string;
  company: string;
  avatar: string;
  quote: string;
  results: string;
  companyLogo: string;
  className?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  name,
  title,
  company,
  avatar,
  quote,
  results,
  companyLogo,
  className = "",
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative flex flex-col items-start rounded-xl border border-gray-100
        bg-white/80 backdrop-blur-sm p-6 sm:p-8 hover:shadow-lg hover:-translate-y-1
        transition-all duration-300
        ${className}
      `}
    >
      {/* Avatar with gradient border */}
      <div className="relative mb-4">
        <img
          src={avatar}
          alt={name}
          className="w-16 h-16 rounded-full border-4 border-indigo-600/20 object-cover"
        />
        <div className="absolute -top-2 -left-2 w-16 h-16 rounded-full border-2 border-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>

      <p className="mb-4 text-lg text-gray-700 leading-relaxed italic">
        "{quote}"
      </p>

      <div className="flex items-baseline mb-4 space-x-4">
        <div>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-sm text-gray-500">
            {title} @ {company}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-sm text-indigo-600 font-medium">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 010-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span>{results}</span>
      </div>

      <div className="mt-4">
        <img
          src={companyLogo}
          alt={company + " logo"}
          className="h-8 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300"
        />
      </div>
    </motion.div>
  );
};