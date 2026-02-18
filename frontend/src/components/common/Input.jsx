const Input = ({ label, ...props }) => (
  <label className="flex flex-col gap-2 text-sm text-slate-200">
    {label}
    <input
      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 outline-none ring-blue-400 focus:ring"
      {...props}
    />
  </label>
);

export default Input;
