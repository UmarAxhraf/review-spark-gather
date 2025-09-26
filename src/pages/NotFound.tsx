import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      {/* Icon */}
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 text-red-600 mb-6">
        <AlertTriangle className="w-10 h-10" />
      </div>

      {/* Error Code */}
      <h1 className="text-6xl font-extrabold text-gray-900">404</h1>
      <p className="mt-2 text-xl text-gray-700 font-medium">
        Oops! Page not found
      </p>
      <p className="mt-1 text-gray-500 text-sm">
        The page <span className="font-mono">{location.pathname}</span> does not
        exist or has been moved.
      </p>

      {/* Actions */}
      <div className="mt-8 flex space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
