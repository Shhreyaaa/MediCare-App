# MediCare-App

## Live Demo: https://medi-care-app-hl9m.vercel.app/

A web app that helps patients track their medication schedule and allows caretakers to monitor adherence.
Built using React, Supabase, and TypeScript.

## Patient Dashboard
-Signup / Login / Logout using Supabase authentication.

-Basic CRUD operations for managing medications: Add medications (name, dosage, frequency, etc).

-View medications: list of upcoming and completed doses.

-Calendar view showing daily medication status (taken / missed).

## Caretaker Dashboard
-Link patients by email (with validation for patient role).

-Select linked patients to monitor.

-Daily Medication Set:

 -Shows Pending if patient hasn't taken medication.
 
 -Shows Completed with proof photo if medication was taken.
 
-Monthly Adherence Progress:

 -Displays count of Taken, Missed, and Remaining days.
 
-Recent Activity: View a summary of recent medication logs.

-Calendar view: Visual overview of taken / missed days.

-Send Reminder Email to patients (pre-filled mailto link).


## Summary:
1.User login/signup with Supabase Auth

2.Add medications (name, dosage, frequency)

3.View medication list

4.Mark medication as taken today

5.Simple adherence percentage display

6.Caretaker-patient real time updates

7.File uploads
