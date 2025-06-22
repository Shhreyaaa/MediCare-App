
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Image, Camera, Clock } from "lucide-react";
import { format } from "date-fns";


interface MedicationDetail {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  description: string;
}

interface MedicationTrackerProps {
  date: string;
  isTaken: boolean;
  onMarkTaken: (date: string, imageFile?: File, medicationDetail?:{name:string;dosage:string;frequency:string}) => void;
  isToday: boolean;  
  medicationList: MedicationDetail[];
  onDeleteMedication: (index: number) => void;  
}

const MedicationTracker = ({ date, isTaken, onMarkTaken, isToday, medicationList, onDeleteMedication  }: MedicationTrackerProps) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);




  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMarkTaken = () => {
     const firstMedication = medicationList[0]; 
    onMarkTaken(date, selectedImage || undefined, firstMedication ? {
      name: firstMedication.name,
      dosage: firstMedication.dosage,
      frequency: firstMedication.frequency
    } : undefined);
    setSelectedImage(null);
    setImagePreview(null);
  };

  if (isTaken) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 bg-green-50 rounded-xl border-2 border-green-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 mb-2">
              Medication Completed!
            </h3>
            <p className="text-green-600">
              Great job! You've taken your medication for {format(new Date(date), 'MMMM d, yyyy')}.
            </p>
          </div>
        </div>
        
      
      </div>
    );
  }

  return (
    
    <div className="space-y-6">      
      

      {medicationList.map((medication, index) => (
  <Card key={index} className="hover:shadow-md transition-shadow">
    <CardContent className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-medium">{index + 1}</span>
        </div>
        <div>
          <h4 className="font-medium">{medication.name}</h4>
          <p className="text-muted-foreground">{medication.description}</p>
          <p className="text-sm text-muted-foreground">Dosage: {medication.dosage}</p>
          <p className="text-sm text-muted-foreground">Time: {medication.time}</p>
        </div>
      </div>
      <div>
        <Badge variant="outline">
        <Clock className="w-3 h-3 mr-1" />
        {medication.time}
      </Badge>

      <Button style={{ backgroundColor: 'transparent', color: 'red' ,fontSize: '1.3rem'}} onClick={() => onDeleteMedication(index)}>
          x
        </Button>

      </div>
      
    </CardContent>
    
  </Card>
  
))}


      {/* Image Upload Section */}
      <Card className="border-dashed border-2 border-border/50">
        <CardContent className="p-6">
          <div className="text-center">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">Add Proof Photo (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Take a photo of your medication or pill organizer as confirmation
            </p>
            
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              className="hidden"
            />
            
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mb-4"
            >
              <Camera className="w-4 h-4 mr-2" />
              {selectedImage ? "Change Photo" : "Take Photo"}
            </Button>
            
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Medication proof"
                  className="max-w-full h-32 object-cover rounded-lg mx-auto border-2 border-border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Photo selected: {selectedImage?.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mark as Taken Button */}
      <Button
        onClick={handleMarkTaken}
        className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 text-white"
        disabled={!isToday}
      >
        <Check className="w-5 h-5 mr-2" />
        {isToday ? "Mark as Taken" : "Cannot mark future dates"}
      </Button>

      {!isToday && (
        <p className="text-center text-sm text-muted-foreground">
          You can only mark today's medication as taken
        </p>
      )}
    </div>
  );
};

export default MedicationTracker;
