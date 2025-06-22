import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Check, Calendar as CalendarIcon, Image, User } from "lucide-react";
import MedicationTracker from "./MedicationTracker";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { addMedicationLog,getMedicationLogs,getTakenMedications } from "@/services/medicationTrackerService";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabase/supabaseClient";


const PatientDashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [medicationList, setMedicationList] = useState<any[]>([]);
  const [takenMedications, setTakenMedications] = useState<any[]>([]);
  const navigate = useNavigate();

    const handleLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error.message);
      } else {
        navigate("/login");
      }
    };

    
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };
  checkSession();
}, [navigate]);


  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isTodaySelected = isToday(selectedDate);
  const isSelectedDateTaken = takenDates.has(selectedDateStr);



const handleMarkTaken = async (date: string, imageFile?: File) => {

  try {
    const firstMedication = medicationList[0];
    if (!firstMedication) {
      alert("No medication entry to mark as taken.");
      return;
    }

    await addMedicationLog({
      date,
      name: firstMedication.name,
      dosage: firstMedication.dosage,
      frequency: firstMedication.frequency,
      is_taken: true,
      proofImageFile: imageFile
    });

    setTakenDates(prev => new Set(prev).add(date));
    console.log("Medication marked as taken and stored in DB:", date);

   
    const meds = await getTakenMedications();
    console.log("Taken medications fetched:", meds);
    setTakenMedications(meds);

  } catch (err: any) {
    console.error("Error details:", err);
    alert(`Failed to mark medication as taken: ${err.message || err}`);
  }
};



  const getStreakCount = () => {
    let streak = 0;
    let currentDate = new Date(today);
    
    while (takenDates.has(format(currentDate, 'yyyy-MM-dd')) && streak < 30) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };



  const [medicationForm, setMedicationForm] = useState({
  name: "",
  dosage: "",
  frequency: "",
  time: "",
  description: ""
});

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setMedicationForm((prev) => ({ ...prev, [name]: value }));
};

  const handleAddMedication = () => {
    setMedicationList((prev) => [...prev, { ...medicationForm }]);
    setMedicationForm({
      name: "",
      dosage: "",
      frequency: "",
      time: "",
      description: ""
    });
  };

  useEffect(() => {
  async function fetchData() {
    try {
      const logs = await getMedicationLogs(); 
      const filteredLogs = logs.filter(log => log.date === selectedDateStr);
      setMedicationList(filteredLogs);
    } catch (error) {
      console.error("Failed to fetch medication logs", error);
    }
  }
  fetchData();
}, [selectedDateStr]);

useEffect(() => {
  async function loadLogs() {
    try {
      const logs = await getMedicationLogs();
      const dateSet = new Set(logs.map(log => log.date));
      setTakenDates(dateSet);
    } catch (err) {
      console.error("Failed to load logs", err);
    }
  }
  loadLogs();
}, []);

useEffect(() => {
  async function fetchTaken() {
    try {
      const meds = await getTakenMedications();
      const filtered = meds.filter((m: any) => m.is_taken === true);
      setTakenMedications(filtered);

    } catch (err) {
      console.error("Failed to load taken medications", err);
    }
  }
  fetchTaken();
}, []);







  return (
    <div className="space-y-6 p-10 ps-40 pe-40">
      
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!</h2>
            <p className="text-white/90 text-lg">Ready to stay on track with your medication?</p>
          </div>
          <div className="ml-auto">
            <Button  onClick={handleLogout} variant="destructive"> Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{getStreakCount()}</div>
            <div className="text-white/80">Day Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{takenDates.has(todayStr) ? "✓" : "○"}</div>
            <div className="text-white/80">Today's Status</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{Math.round((takenDates.size / 30) * 100)}%</div>
            <div className="text-white/80">Monthly Rate</div>
          </div>
        </div>
      </div>

      {/* Add Medication Form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <input
            name="name"
            value={medicationForm.name}
            onChange={handleInputChange}
            placeholder="Name"
            className="w-full border p-2 rounded"
          />
          <input
            name="dosage"
            value={medicationForm.dosage}
            onChange={handleInputChange}
            placeholder="Dosage"
            className="w-full border p-2 rounded"
          />
          <input
            name="frequency"
            value={medicationForm.frequency}
            onChange={handleInputChange}
            placeholder="Frequency"
            className="w-full border p-2 rounded"
          />
          <input
            name="time"
            value={medicationForm.time}
            onChange={handleInputChange}
            placeholder="Time"
            className="w-full border p-2 rounded"
          />
          <input
            name="description"
            value={medicationForm.description}
            onChange={handleInputChange}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />
          <Button onClick={handleAddMedication}>Add Medication</Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Medication */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                {isTodaySelected ? "Today's Medication" : `Medication for ${format(selectedDate, 'MMMM d, yyyy')}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MedicationTracker 
                date={selectedDateStr}
                isTaken={isSelectedDateTaken}
                onMarkTaken={handleMarkTaken}
                isToday={isTodaySelected}
                medicationList={medicationList}
                
              />
            </CardContent>
            
          </Card>
          <Card className="mt-6">
  <CardHeader>
    <CardTitle className="text-xl">Medications Taken</CardTitle>
  </CardHeader>
  <CardContent>
    {takenMedications.length === 0 ? (
      <div className="text-gray-500 text-center py-4">
        No medications marked as taken yet.
      </div>
    ) : (
      <ul className="space-y-3">
        {takenMedications.map((med) => (
          <li 
            key={med.id} 
            className="p-3 border rounded-lg flex justify-between items-center hover:bg-gray-50 transition"
          >
            <div>
              <div className="font-semibold">{med.name || "Unnamed Medication"}</div>
              <div className="text-sm text-gray-500">
                {med.dosage || "No dosage"} 
              </div>
              
            </div>
            <Badge className="bg-green-100 text-green-700">{med.date}</Badge>
          </li>
        ))}
      </ul>
    )}
  </CardContent>
</Card>

 </div>
        

        {/* Calendar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Medication Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                modifiersClassNames={{
                selected: "bg-blue-600 text-white hover:bg-blue-700",
                }}
                components={{
                  DayContent: ({ date }) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isTaken = takenDates.has(dateStr);
                    const isPast = isBefore(date, startOfDay(today));
                    const isCurrentDay = isToday(date);
                    
                    return (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <span>{date.getDate()}</span>
                        {isTaken && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                        {!isTaken && isPast && !isCurrentDay && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    );
                  }
                }}
              />
              
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Medication taken</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span>Missed medication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;