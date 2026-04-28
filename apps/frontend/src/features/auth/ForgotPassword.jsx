import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { forgotPassword } from "../../shared/utils/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await forgotPassword({ email });
      setSuccessMessage(response.message || "Password reset link sent.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to process request.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageFrame className="login-view">
      <motion.div className="login-route-stage" initial="hidden" animate="show" variants={staggerParent}>
        <motion.section className="login-card login-page-shell" variants={staggerItem}>
          <p className="login-welcome">Password Reset</p>
          <h2 className="login-title">Forgot Password?</h2>
          <p className="login-subtitle">Enter your email and we will send you a reset link.</p>

          <form onSubmit={handleSubmit} className="form-layout">
            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            {errorMessage && <p className="field-error" role="alert">{errorMessage}</p>}
            {successMessage && <p className="section-intro compact" role="alert">{successMessage}</p>}

            <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <motion.p className="link-row login-link-row" variants={staggerItem}>
            Remember your password? <Link to="/">Go to Login</Link>
          </motion.p>
        </motion.section>
      </motion.div>
    </PageFrame>
  );
}
