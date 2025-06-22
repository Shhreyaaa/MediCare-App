import { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"patient" | "caretaker">("patient");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("No user returned from login.");

        const userId = data.user.id;
        const userEmail = data.user.email;

        let { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Profile fetch error:", profileError.message);
          throw new Error("Failed to fetch profile.");
        }

        if (!profile) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: userId,
            role,
            email: userEmail,
          });

          if (insertError) {
            console.error("Profile insert error:", insertError.message);
            throw new Error("Login succeeded but profile creation failed.");
          }

          profile = { role };
        }

        if (profile.role === "patient") {
          navigate("/patient-dashboard");
        } else if (profile.role === "caretaker") {
          navigate("/caretaker-dashboard");
        } else {
          setMessage("Login succeeded but unknown role.");
        }

      } else {
        // SIGNUP FLOW
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw new Error(error.message);

        setMessage("Signup successful! Check your email to confirm before logging in.");
      }

    } catch (err: any) {
      setMessage(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-20 p-4 border rounded space-y-10">
      <h2 className="text-2xl font-bold">{isLogin ? "Login" : "Sign Up"}</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
          disabled={isLoading}
        />

        {!isLogin && (
          <div className="flex gap-5">
            <label className="flex items-center gap-1 mb-2 mt-2">
              <input
                type="radio"
                value="patient"
                checked={role === "patient"}
                onChange={() => setRole("patient")}
                disabled={isLoading}
              />
              Patient
            </label>
            <label className="flex items-center gap-1 mb-2 mt-2">
              <input
                type="radio"
                value="caretaker"
                checked={role === "caretaker"}
                onChange={() => setRole("caretaker")}
                disabled={isLoading}
              />
              Caretaker
            </label>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign Up")}
        </Button>
      </form>

      <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} disabled={isLoading}>
        {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
      </Button>

      {message && (
        <div className={`text-sm ${message.includes("successful") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AuthForm;
