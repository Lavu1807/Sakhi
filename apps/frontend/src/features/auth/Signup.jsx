import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { signupUser } from "../../shared/utils/api";

export default function Signup() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateSignup() {
    const nextErrors = {};
    const emailPattern = /^\S+@\S+\.\S+$/;

    if (!formValues.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }

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

  async function handleRegister(event) {
    event.preventDefault();

    const validationErrors = validateSignup();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setApiError("");
    setApiSuccess("");
    setIsSubmitting(true);

    try {
      await signupUser({
        name: formValues.name.trim(),
        email: formValues.email.trim(),
        password: formValues.password,
      });

      setApiSuccess("Signup successful. Please login.");
      navigate("/", { replace: true });
    } catch (error) {
      setApiError(error.message || "Unable to signup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageFrame>
      <motion.section className="page-card auth-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Start Your Journey
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            ✨
          </span>
          Signup
        </motion.h2>

        <motion.p className="section-intro compact" variants={staggerItem}>
          Build your profile and personalize your cycle wellness experience.
        </motion.p>

        <motion.form onSubmit={handleRegister} className="form-layout" noValidate variants={staggerParent}>
          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="signup-name">Name</label>
            <input
              id="signup-name"
              type="text"
              name="name"
              placeholder="Enter name"
              value={formValues.name}
              onChange={handleInputChange}
              className={errors.name ? "input-error" : ""}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </motion.div>

          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              name="email"
              placeholder="Enter email"
              value={formValues.email}
              onChange={handleInputChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </motion.div>

          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              name="password"
              placeholder="Enter password"
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

          {apiSuccess && (
            <motion.p className="section-intro compact" variants={staggerItem}>
              {apiSuccess}
            </motion.p>
          )}

          <motion.button type="submit" className="btn-primary btn-block" variants={staggerItem} disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Register"}
          </motion.button>
        </motion.form>

        <motion.p className="link-row" variants={staggerItem}>
          Already have an account? <Link to="/">Back to Login</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


