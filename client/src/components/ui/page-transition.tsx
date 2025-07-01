import { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Variantes de animação para diferentes tipos de transição
 */
const pageTransitionVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const slideTransitionVariants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 }
};

const scaleTransitionVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 }
};

/**
 * Componente para transições de página com fading e sliding
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Componente de transição com slide-in
 */
export function SlideInTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={slideTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Componente de transição com scale
 */
export function ScaleTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={scaleTransitionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Componente para animação de sequência de itens
 */
export function SequenceTransition({ 
  children, 
  delay = 0.05 
}: { 
  children: ReactNode[]; 
  delay?: number;
}) {
  return (
    <>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, delay: index * delay }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}