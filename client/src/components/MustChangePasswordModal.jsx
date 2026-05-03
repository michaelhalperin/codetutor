import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AlertTriangle, Eye, EyeOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

export default function MustChangePasswordModal() {
  const { user, mustChangePassword, completeMandatoryPasswordChange, signOut } =
    useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!user || !mustChangePassword) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await completeMandatoryPasswordChange(password);
      setPassword("");
      setConfirm("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err.message || "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      window.location.href = "/login";
    } catch {
      toast.error("Could not sign out.");
      setSigningOut(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-dark-950/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="must-change-password-title"
    >
      <div className="w-full max-w-md bg-dark-800 rounded-2xl border border-amber-600/40 p-8 shadow-2xl">
        <div className="flex items-start gap-3 mb-5">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="text-amber-400" size={22} />
          </div>
          <div>
            <h2
              id="must-change-password-title"
              className="text-lg font-semibold text-white"
            >
              Change your password
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              You signed in with a temporary password. Set a new password now
              before continuing.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-slate-600 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                placeholder="Choose a strong password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm new password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-dark-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
              placeholder="Repeat password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound size={18} />
                Save new password
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut || saving}
            className="text-slate-400 hover:text-slate-300 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out instead"}
          </button>
        </p>
      </div>
    </div>
  );
}
