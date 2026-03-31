import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

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

  function handleLogin(event) {
    event.preventDefault();

    const validationErrors = validateLogin();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    navigate("/dashboard");
  }

  return (
    <main className="page-shell">
      <section className="page-card auth-card">
        <h2 className="heading-with-icon">
          <span className="heading-icon" aria-hidden="true">
            🔐
          </span>
          Login
        </h2>

        <form onSubmit={handleLogin} className="form-layout" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="Enter email"
              value={formValues.email}
              onChange={handleInputChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="Enter password"
              value={formValues.password}
              onChange={handleInputChange}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          <button type="submit" className="btn-primary btn-block">
            Login
          </button>
        </form>

        <p className="link-row">
          New user? <Link to="/signup">Go to Signup</Link>
        </p>
      </section>
    </main>
  );
}
