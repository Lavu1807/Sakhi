import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { loginUser } from "../../shared/utils/api";
import { saveAuthSession } from "../../shared/utils/auth";

export default function Login() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateLogin() {
    const nextErrors = {};
    const emailPattern = /^\S+@\S+\.\S+$/;

    if (!formValues.email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!emailPattern.test(formValues.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formValues.password.trim()) {
      nextErrors.password = "Password cannot be empty.";
    }

    return nextErrors;
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();

    const validationErrors = validateLogin();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setApiError("");
    setIsSubmitting(true);

    try {
      const response = await loginUser({
        email: formValues.email.trim(),
        password: formValues.password,
      });

      saveAuthSession({
        token: response.token,
        user: response.user,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setApiError(error.message || "Unable to login. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageFrame className="page-shell login-page-shell">
      <motion.section className="page-card auth-card login-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="login-welcome" variants={staggerItem}>
          Welcome to SAKHI
        </motion.p>

        <motion.h2 className="login-title" variants={staggerItem}>
          Sign in
        </motion.h2>

        <motion.p className="login-subtitle" variants={staggerItem}>
          Continue your calm, personalized wellness journey.
        </motion.p>

        <motion.form onSubmit={handleLogin} className="form-layout" noValidate variants={staggerParent}>
          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formValues.email}
              onChange={handleInputChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </motion.div>

          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formValues.password}
              onChange={handleInputChange}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </motion.div>

          {apiError && (
            <motion.p className="field-error" variants={staggerItem}>
              {apiError}
            </motion.p>
          )}

          <motion.button type="submit" className="btn-primary btn-block" variants={staggerItem} disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Continue"}
          </motion.button>
        </motion.form>

        <motion.p className="link-row login-link-row" variants={staggerItem}>
          New user? <Link to="/signup">Go to Signup</Link>
        </motion.p>

        <motion.p className="link-row login-link-row" variants={staggerItem}>
          <Link to="/forgot-password">Forgot Password?</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


