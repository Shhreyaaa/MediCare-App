import { useState } from "react";
import { supabase } from "@/supabase/supabaseClient";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<"patient" | "caretaker">("patient");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (isLogin) {
      // LOGIN FLOW
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return setMessage(error.message);

      const userId = data.user.id;
      const userEmail = data.user.email;

      // Check if profile exists
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile fetch error:", profileError.message);
      }

      if (!profile) {
        // Insert profile if missing
        const { error: insertError } = await supabase.from("profiles").insert({
          id: userId,
          role,  // ⚠ You may want to ask user role again if this is login
          email: userEmail,  // ✅ Now we have confirmed email
        });

        if (insertError) {
          console.error("Profile insert error:", insertError.message);
          return setMessage("Login successful, but profile creation failed.");
        }

        profile = { role }; // fallback
      }

      // Navigate based on role
      if (profile.role === "patient") {
        navigate("/patient-dashboard");
      } else if (profile.role === "caretaker") {
        navigate("/caretaker-dashboard");
      } else {
        setMessage("Login successful, but could not determine role.");
      }

    } else {
      // SIGNUP FLOW
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return setMessage(error.message);

      setMessage("Signup successful! Please check your email to confirm before logging in.");
      // ⛔ Don't insert into profiles yet — wait for confirmed login
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-40 p-4 border rounded space-y-10">
      <h2 className="text-2xl font-bold">{isLogin ? "Login" : "Sign Up"}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        {!isLogin && (
          <div className="flex gap-5">
            <label className="flex items-center gap-1 mb-2 mt-2">
              <input
                type="radio"
                value="patient"
                checked={role === "patient"}
                onChange={() => setRole("patient")}
              />
              Patient
            </label>
            <label className="flex items-center gap-1 mb-2 mt-2">
              <input
                type="radio"
                value="caretaker"
                checked={role === "caretaker"}
                onChange={() => setRole("caretaker")}
              />
              Caretaker
            </label>
          </div>
        )}
        <Button type="submit" className="w-full">
          {isLogin ? "Login" : "Sign Up"}
        </Button>
      </form>
      <Button variant="ghost" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
      </Button>
      {message && <div className="text-sm text-red-600">{message}</div>}
    </div>
  );
};

export default AuthForm;

