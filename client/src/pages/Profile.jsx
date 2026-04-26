import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  KeyRound,
  CalendarDays,
  LogOut,
  AlertTriangle,
} from "lucide-react";

function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function Profile() {
  const { user, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const initialName = useMemo(
    () => user?.user_metadata?.full_name || "",
    [user?.user_metadata?.full_name],
  );

  const [fullName, setFullName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const nameChanged = trimmedName !== initialName.trim();
    const passwordProvided = Boolean(password.trim() || confirm.trim());

    if (passwordProvided && password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    if (passwordProvided && password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (!nameChanged && !passwordProvided) {
      toast.error("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        fullName: nameChanged ? trimmedName : undefined,
        password: passwordProvided ? password : undefined,
      });
      setPassword("");
      setConfirm("");
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
      navigate("/login");
    } catch {
      toast.error("Failed to sign out.");
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Profile Settings</h1>
          <p className="text-slate-400">Manage your account details and password</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-2xl border border-slate-700 p-5">
              <div className="w-14 h-14 rounded-2xl bg-primary-600/90 flex items-center justify-center mb-4">
                <User size={24} className="text-white" />
              </div>
              <p className="text-white font-semibold text-lg">
                {user?.user_metadata?.full_name || "Unnamed user"}
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-start gap-2 text-slate-300">
                  <Mail size={16} className="mt-0.5 text-slate-400 shrink-0" />
                  <span className="break-all">{user?.email || "N/A"}</span>
                </div>
                <div className="flex items-start gap-2 text-slate-300">
                  <CalendarDays size={16} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>Joined: {formatDate(user?.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-dark-800 rounded-2xl border border-red-900/40 p-5">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                <LogOut size={16} className="text-red-400" />
                Sign Out
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                For safety, signing out requires confirmation.
              </p>

              {!showSignOutConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowSignOutConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition"
                >
                  Sign Out
                </button>
              ) : (
                <div className="border border-red-700/40 rounded-xl bg-red-900/15 p-4">
                  <p className="text-sm text-red-200 flex items-start gap-2 mb-3">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    Are you sure you want to sign out?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition"
                    >
                      {signingOut ? "Signing out..." : "Yes, Sign Out"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignOutConfirm(false)}
                      disabled={signingOut}
                      className="bg-dark-900 border border-slate-600 hover:border-slate-500 text-slate-200 font-semibold px-4 py-2 rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <form
              onSubmit={handleSave}
              className="bg-dark-800 rounded-2xl border border-slate-700 p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-dark-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-1">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <KeyRound size={16} className="text-primary-400" />
                  Change Password
                </h2>

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full bg-dark-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                  />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-dark-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Leave these fields empty if you do not want to change your password.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
