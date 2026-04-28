import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
    filter: "blur(3px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export default function PageFrame({ children, className = "page-shell" }) {
  return (
    <motion.main className={className} variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.main>
  );
}

PageFrame.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

