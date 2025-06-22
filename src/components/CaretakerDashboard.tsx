import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Users, Bell, Calendar as CalendarIcon, Mail, AlertTriangle, Check, Clock, Camera } from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import { format, subDays, isToday, isBefore, startOfDay } from "date-fns";
import { supabase } from "@/supabase/supabaseClient";
import { eachDayOfInterval, startOfMonth} from "date-fns";
import { useNavigate } from "react-router-dom";




const CaretakerDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [patientEmail, setPatientEmail] = useState("");
  const [linkMessage, setLinkMessage] = useState("");
  const [linkedPatients, setLinkedPatients] = useState<any[]>([]);
  const [currentPatient, setCurrentPatient] = useState<any>(null);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [missedDoses, setMissedDoses] = useState(0);
  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [todayStatus, setTodayStatus] = useState<"pending" | "completed">("pending");
  const [remainingCount, setRemainingCount] = useState(0);
  const [todayActivity, setTodayActivity] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);


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


const patientName = currentPatient?.profiles?.email
  ? currentPatient.profiles.email.replace(/@.*$/, "")
  : "No patient selected";


  const fetchLinkedPatients = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    console.error("Could not fetch caretaker info");
    return;
  }
  const caretakerId = userData.user.id;

 
  const { data: links, error: linkError } = await supabase
    .from("patient_caretaker")
    .select("patient_id, profiles (id, email)")
    .eq("caretaker_id", caretakerId);

  if (linkError) {
    console.error("Error fetching linked patients:", linkError.message);
    return;
  }

 
  const profiles = await Promise.all(
    links.map(async (link) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("id", link.patient_id)
        .single();

      if (profileError) {
        console.error(`Error fetching profile for ${link.patient_id}:`, profileError.message);
        return { patient_id: link.patient_id, profiles: null };
      }

      return { patient_id: link.patient_id, profiles: profile };
    })
  );

  setLinkedPatients(profiles);
};



  const fetchMedicationData = async (patientId: string) => {
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("user_id", patientId);
      console.log("Fetched data:", data);
     


    if (error) {
      console.error("Error fetching medication data:", error.message);
      return;
    }

    if (data) {
      const datesTaken = new Set(data.filter(d => d.is_taken).map(d => d.date));
      setTakenDates(datesTaken);

      const adherence = data.length > 0 ? (datesTaken.size / data.length) * 100 : 0;
      setAdherenceRate(Math.round(adherence));


      let streak = 0;
      let dateCursor = startOfDay(new Date());
      while (datesTaken.has(format(dateCursor, 'yyyy-MM-dd'))) {
        streak++;
        dateCursor = subDays(dateCursor, 1);
      }

      setCurrentStreak(streak);
      const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(sorted.slice(0, 5).map(d => ({
        date: d.date,
        taken: d.is_taken,
        proof_photo: d.proof_photo || null,
      })));

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setTodayStatus(datesTaken.has(todayStr) ? "completed" : "pending");

      const todayData = data.find(d => d.date === todayStr);
      setTodayActivity(todayData || null);
    }



    const today = new Date();
    const allDaysThisMonth = eachDayOfInterval({
      start: startOfMonth(today),
      end: today,
    }).map(d => format(d, 'yyyy-MM-dd'));

const takenCount = allDaysThisMonth.filter(day => takenDates.has(day)).length;
const missedCount = allDaysThisMonth.length - takenCount;
const remainingCount = 30 - allDaysThisMonth.length;

 setMissedDoses(missedCount);
setRemainingCount(remainingCount);



  };

  const linkPatientByEmail = async () => {
    setLinkMessage("");

    if (!patientEmail) {
      setLinkMessage("Please enter a patient email.");
      return;
    }

    const { data: patientProfile, error: fetchError } = await supabase
      .from("profiles")
      .select("id, role, email")
      .eq("email", patientEmail)
      .single();

    if (fetchError || !patientProfile) {
      setLinkMessage("No patient found with this email.");
      return;
    }

    if (patientProfile.role !== "patient") {
      setLinkMessage("This email does not belong to a patient.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setLinkMessage("Could not fetch caretaker info.");
      return;
    }
    const caretakerId = userData.user.id;

   const { data: existingLink, error: checkError } = await supabase
  .from("patient_caretaker")
  .select("patient_id")
  .eq("patient_id", patientProfile.id)
  .eq("caretaker_id", caretakerId)
  .maybeSingle();

if (checkError) {
  console.error("Error checking existing link:", checkError.message);
  setLinkMessage("Error checking existing link.");
  return;
}

if (existingLink) {
  setLinkMessage("This patient is already linked.");
  return;
}


   const { error: insertError } = await supabase
    .from("patient_caretaker")
    .insert({
      patient_id: patientProfile.id,
      caretaker_id: caretakerId,
    });

    if (insertError) {
      setLinkMessage("Failed to link patient: " + insertError.message);
    } else {
      setLinkMessage("Patient linked successfully!");
      setPatientEmail("");
      fetchLinkedPatients(); 
    }
  };

  useEffect(() => {
    fetchLinkedPatients();
  }, []);

  useEffect(() => {
    if (!currentPatient?.patient_id) return;



    fetchMedicationData(currentPatient.patient_id);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const channel = supabase
      .channel('medications-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'medications' },
        (payload) => {
          const { eventType, new: newRecord } = payload;
          if (
            (eventType === "INSERT" || eventType === "UPDATE") &&
            newRecord.user_id === currentPatient.user_id &&
            newRecord.date === todayStr &&
            newRecord.is_taken
          ) {
            setTodayStatus("completed");
            fetchMedicationData(currentPatient.patient_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPatient]);

  const handleSendReminderEmail = () => {
    if (!currentPatient?.profiles?.email) {
    alert("Please select a patient with a valid email.");
    return;
  }
  window.location.href = `mailto:${currentPatient.profiles.email}?subject=Medication Reminder&body=This is a friendly reminder to take your medication today.`;
  };

  const handleConfigureNotifications = () => setActiveTab("notifications");
  const handleViewCalendar = () => setActiveTab("calendar");







  return (
    <div className="space-y-6 pt-10 ps-20 pe-20">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Caretaker Dashboard</h2>
            <p className="text-white/90 text-lg">Monitoring {patientName}'s medication adherence</p>
          </div>
          <div className="ml-auto">
            <Button  onClick={handleLogout} variant="destructive"> Logout
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{adherenceRate}%</div>
            <div className="text-white/80">Adherence Rate</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-white/80">Current Streak</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{missedDoses}</div>
            <div className="text-white/80">Missed This Month</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold">{recentActivity.filter(a => a.taken).length}</div>
            <div className="text-white/80">Taken This Week</div>
          </div>
        </div>
      </div>

     <Card>
  <CardHeader>
    <CardTitle>Link a Patient</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <input
      type="email"
      placeholder="Enter patient email"
      value={patientEmail}
      onChange={(e) => setPatientEmail(e.target.value)}
      className="w-full border p-2 rounded"
    />
    <Button onClick={linkPatientByEmail}>
      Link Patient
    </Button>
    {linkMessage && (
      <div className="text-sm text-blue-600">{linkMessage}</div>
    )}
  </CardContent>
</Card>

<div className="mb-4">
  <label>Select Linked Patient:</label>
  <select
    className="border rounded p-2 w-full"
    value={currentPatient?.patient_id || ""}
    onChange={(e) => {
  const selected = linkedPatients.find(p => p.patient_id === e.target.value);
  setCurrentPatient(selected);
  if (selected) {
    fetchMedicationData(selected.patient_id);
  }
    }}
  >
    <option value="">Select patient</option>
    {linkedPatients.map((p) => (
      <option key={p.patient_id} value={p.patient_id}>
        {p.profiles?.name || p.profiles?.email}
      </option>
    ))}
  </select>
</div>




      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Today's Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Daily Medication Set</h4>
                    {todayActivity?.proof_photo ? (
                        <div>
                          <img
                            src={todayActivity.proof_photo}
                            alt="Proof"
                            className="mt-2 w-20 h-20 object-cover rounded border cursor-pointer"
                            onClick={() => setShowImageModal(true)}
                          />
                          
                          {showImageModal && (
                            <div
                              className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
                              onClick={() => setShowImageModal(false)}
                            >
                              <img
                                src={todayActivity.proof_photo}
                                alt="Proof Large"
                                className="max-h-[40%] max-w-[40%] rounded shadow-lg"
                                onClick={(e) => e.stopPropagation()} // prevent closing when clicking the image itself
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">No proof added</p>
                      )}


                    <p className="text-sm text-muted-foreground">{todayActivity?.description}</p>

                  </div>
                  <Badge variant={todayStatus === "pending" ? "destructive" : "secondary"}>
                    {todayStatus === "pending" ? "Pending" : "Completed"}
                  </Badge>

                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleSendReminderEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder Email
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleConfigureNotifications}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Configure Notifications
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleViewCalendar}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  View Full Calendar
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Adherence Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Adherence Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{adherenceRate}%</span>
                </div>
                <Progress value={adherenceRate} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="font-medium text-green-600">{currentStreak}</div>
                    <div className="text-muted-foreground">Taken</div>
                  </div>
                  <div>
                    <div className="font-medium text-red-600">{missedDoses}</div>
                    <div className="text-muted-foreground">Missed</div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-600">{remainingCount} days</div>
                    <div className="text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Medication Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.taken ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {activity.taken ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(new Date(activity.date), 'EEEE, MMMM d')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.taken ? `Taken at ${activity.time}` : 'Medication missed'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activity.hasPhoto && (
                        <Badge variant="outline">
                          <Camera className="w-3 h-3 mr-1" />
                          Photo
                        </Badge>
                      )}
                      <Badge variant={activity.taken ? "secondary" : "destructive"}>
                        {activity.taken ? "Completed" : "Missed"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Medication Calendar Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
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
                        const isPast = isBefore(date, startOfDay(new Date()));
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
                </div>

                <div>
                  <h4 className="font-medium mb-4">
                    Details for {format(selectedDate, 'MMMM d, yyyy')}
                  </h4>
                  
                  <div className="space-y-4">
                    {takenDates.has(format(selectedDate, 'yyyy-MM-dd')) ? (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">Medication Taken</span>
                        </div>
                        <p className="text-sm text-green-700">
                          {patientName} successfully took their medication on this day.
                        </p>
                      </div>
                    ) : isBefore(selectedDate, startOfDay(new Date())) ? (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-800">Medication Missed</span>
                        </div>
                        <p className="text-sm text-red-700">
                          {patientName} did not take their medication on this day.
                        </p>
                      </div>
                    ) : isToday(selectedDate) ? (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-800">Today</span>
                        </div>
                        <p className="text-sm text-blue-700">
                          Monitor {patientName}'s medication status for today.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarIcon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-800">Future Date</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          This date is in the future.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CaretakerDashboard;
