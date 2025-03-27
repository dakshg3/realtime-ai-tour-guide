export default function Button({ icon, children, onClick, className }) {
  return (
    <button
      className={`text-white rounded-md py-3 px-5 flex items-center justify-center gap-2 transition-all duration-200 font-medium shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none ${className}`}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}
