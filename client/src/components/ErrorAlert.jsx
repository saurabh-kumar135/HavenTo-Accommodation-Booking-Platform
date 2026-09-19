const ErrorAlert = ({ errors }) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-900 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-3 shadow-xs" role="alert">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-red-500 flex items-center justify-center text-white shrink-0 shadow-xs">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 font-medium text-rose-900">
        {errors.length === 1 ? (
          <div>{errors[0]}</div>
        ) : (
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
