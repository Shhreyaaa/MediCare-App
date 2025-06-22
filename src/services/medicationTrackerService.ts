import { supabase } from "@/supabase/supabaseClient";

export const addMedicationLog = async ({
  date,
  name,
  dosage,
  frequency,
  is_taken,
  proofImageFile
}: {
  date: string;
  name: string;
  dosage: string;
  frequency: string;
  is_taken: boolean;
  proofImageFile?: File;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  let proof_photo = "";

  if (proofImageFile) {
    const fileName = `${user.id}/${Date.now()}-${proofImageFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("medicationproofs")
      .upload(fileName, proofImageFile);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase
      .storage
      .from("medicationproofs")
      .getPublicUrl(fileName);

    proof_photo = urlData?.publicUrl || "";
  }

  const { error } = await supabase
    .from("medications")
    .insert({
      user_id: user.id,
      date,
      name,
      dosage,
      frequency,
      is_taken,
      proof_photo    
    });

  if (error) throw error;
};

export const getMedicationLogs = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const { data, error } = await supabase
    
  .from("medications")
  .select("*")
  .eq("user_id", user.id)
    


  if (error) throw error;
  return data;
};



export const getTakenMedications = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not logged in");

  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_taken", true);

  if (error) throw error;
  return data || [];
};



