import { motion } from "framer-motion";

interface GradientButtonProps {
  children: React.ReactNode;
  gradient?: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  gradient = "from-primary to-accent-cyan",
  className = "",
  onClick,
  disabled = false,
  size = "md",
  fullWidth = false,
}) => {
  const sizeConfig: Record<string, { px: string; py: string; text: string }> = {
    sm: { px: "3", py: "1", text: "text-sm" },
    md: { px: "4", py: "2", text: "text-base" },
    lg: { px: "6", py: "3", text: "text-lg" },
  };

  const { px, py, text } = sizeConfig[size];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative overflow-hidden flex items-center justify-center gap-2
        rounded-xl bg-gradient-to-tr ${gradient}
        px-${px} py-${py} ${text} font-semibold text-white
        transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};