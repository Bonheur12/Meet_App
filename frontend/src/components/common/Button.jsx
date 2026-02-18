const styles = {
  primary: "bg-blue-600 hover:bg-blue-500 text-white",
  secondary: "bg-slate-700 hover:bg-slate-600 text-white",
  danger: "bg-rose-600 hover:bg-rose-500 text-white",
};

const Button = ({ variant = "primary", className = "", ...props }) => (
  <button
    className={`rounded-lg px-4 py-2 font-medium transition ${styles[variant]} ${className}`}
    {...props}
  />
);

export default Button;
