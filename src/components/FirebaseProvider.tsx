import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, subscribeToNetworkChange } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  explorerLevel: string;
  availablePoints: number;
  totalTrips: number;
  createdAt: any;
  referralCode?: string;
  referredBy?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOffline: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, isOffline: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribeNetwork = subscribeToNetworkChange((offline) => {
      setIsOffline(offline);
    });
    return () => unsubscribeNetwork();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Initialize new user profile with potentially stored referral code
            let referredByCode = '';
            let referralPointsBonus = 0;
            const savedRefCode = typeof window !== 'undefined' ? sessionStorage.getItem('voyago_ref_code') : null;
            
            if (savedRefCode) {
              try {
                const codeSnap = await getDoc(doc(db, 'referralCodes', savedRefCode));
                if (codeSnap.exists()) {
                  const referrerData = codeSnap.data();
                  const referrerUid = referrerData.uid;
                  
                  referredByCode = savedRefCode;
                  referralPointsBonus = 1000;
                  
                  const claimId = `${user.uid}_${referrerUid}`;
                  await setDoc(doc(db, 'referrals', claimId), {
                    referrerUid,
                    refereeUid: user.uid,
                    refereeName: user.displayName || user.email?.split('@')[0] || 'New Explorer',
                    pointsAwarded: 2500,
                    status: 'pending',
                    createdAt: serverTimestamp()
                  });
                  
                  const notificationId = `ref_${user.uid}_${Date.now()}`;
                  await setDoc(doc(db, 'users', referrerUid, 'notifications', notificationId), {
                    type: 'Referral',
                    title: 'Referral Bonus Available!',
                    message: `${user.displayName || 'A friend'} used your code ${savedRefCode}! You have a 2,500 points reward pending to claim in your Profile.`,
                    read: false,
                    createdAt: serverTimestamp()
                  });
                  
                  // Clear code since we applied it
                  sessionStorage.removeItem('voyago_ref_code');
                }
              } catch (e) {
                console.error("Error applying auto referral inside auth provider:", e);
              }
            }

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              explorerLevel: 'Gold',
              availablePoints: 12400 + referralPointsBonus,
              totalTrips: 24,
              createdAt: serverTimestamp(),
              ...(referredByCode ? { referredBy: referredByCode } : {})
            };
            await setDoc(userDocRef, newProfile);
            
            // Seed Data to match Design
            const savedRef = collection(db, 'users', user.uid, 'savedDestinations');
            await setDoc(doc(savedRef, 'amalfi'), {
              destinationId: 'amalfi',
              title: 'Amalfi Coast, Italy',
              recommendation: 'Recommended for: Late Summer',
              imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXbMfMH92Idscq2OH-1zdVtug4pI99l9KImSkRsGmv2x6vCMi4pWk8FHTa-W5VQAuT7aHJ-lWuVrecGpZ0lchJQNvWPI4cp3G78rdloO26STAOM9P1E8P7ynaIqTHkuxvkEa3Tg2RkoHkXWHiHlOm6oYECsDubLJbK_5dyBR1K8G2jLe984zHLo4mgT_kaxwenjNNunEX_ht7VRlhhdq339yJpdsLueKH1EHXScU0ku65sTp1uuVCm3GULz9mUwg3tmMoDTv3LrKI',
              savedAt: serverTimestamp()
            });
            await setDoc(doc(savedRef, 'kyoto'), {
              destinationId: 'kyoto',
              title: 'Kyoto, Japan',
              recommendation: 'Recommended for: Fall Foliage',
              imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBggAzW9e-_XJQQIvV5b5ZzLJpohgRfkk8gp_5FLSzqBHMkLcDitsn-jXVMD2jEZLww1_ATB7WhM6szSSAEUKoTI-17eepljGa1ffwXQ3T9RHQCPlEck-6hYh-N3NT_mQu2iX5InuSLRUUypQmHG4-Q9m-8OX1JOWq6V8VgInwgXsm-CXeK8j79zaMeeSIcN6znCg8cdpoCKyTt-sLbTlKNHQ4zI_8Q_BQusoV0Y0kxUVxZdW7R-zITK-mXQLho1LsuLruXYsIvTDw',
              savedAt: serverTimestamp()
            });

            const bookingsRef = collection(db, 'users', user.uid, 'bookings');
            await setDoc(doc(bookingsRef, 'paris'), {
              destinationTitle: 'Paris Weekend Getaway',
              startDate: 'May 12 - 15, 2024',
              nights: 3,
              amount: 1240,
              status: 'completed',
              imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_aCbBo8cjosfmB2fizaZ1ntBYAMWPVEAfkK-7GkA8melGKRRbFjfcu27-m1X6VyITRNu8RMUqZaPY6u0H__uvbcYChVnSzlbrW_Oc-jV6XQDHU9QjhfbWmcepCK9r1618lF0zY-nFupn6g0SPYdYg-fn6RoVk22tV-9VYTM51dvbOhSsx5s2IAaXfCXqWSMkxlSPpu5Padkj620Jlgjak4bW3GK-9rhzL_TUwtUsqQvUDh6Jf78VvuXTXgJxUiKNUNOhtpmfMrqg',
              flightInfo: 'Air France AF681 • Business Class',
              airline: 'Air France',
              flightNumber: 'AF681',
              departureTime: '10:30 AM',
              arrivalTime: '11:45 AM',
              terminal: '2E',
              gate: 'K32',
              hotelInfo: 'Hotel Plaza Athénée • Deluxe Room',
              hotelName: 'Hotel Plaza Athénée',
              roomType: 'Deluxe Room',
              checkIn: '3:00 PM',
              checkOut: '12:00 PM',
              createdAt: serverTimestamp()
            });
            await setDoc(doc(bookingsRef, 'swiss'), {
              destinationTitle: 'Swiss Alp Retreat',
              startDate: 'February 02 - 09, 2024',
              nights: 7,
              amount: 3850,
              status: 'completed',
              imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCW4A9efGTJe-y7We6AKbqlYSkFf3cr55AAQ7VjmZiAbmKWz2tgSzJD0P9ejsuyNcTI0QmHwbPQjYz1y_9sSp1Mvu8YQCJ60Ofbzml0KymxFnnEYirxYufzoZxkF-6hAJYgwFqSQsGVH9gj5ovfu7v8zJy1QvkUjBEf3EgTpdCm2VxVYqJpRnSwroLX1AK_wA2uMYMi47xVjcsVm1t9KUywT3hV_Ox4iAXLS_OWy-rEHas8Hv71FVDLl1z70DMTwfLlvBpyZUiGENk',
              flightInfo: 'Swiss International Air Lines LX40 • First Class',
              airline: 'Swiss International Air Lines',
              flightNumber: 'LX40',
              departureTime: '08:15 AM',
              arrivalTime: '10:50 AM',
              terminal: '1',
              gate: 'A14',
              hotelInfo: 'Badrutt\'s Palace Hotel • Junior Suite',
              hotelName: 'Badrutt\'s Palace Hotel',
              roomType: 'Junior Suite',
              checkIn: '4:00 PM',
              checkOut: '11:00 AM',
              createdAt: serverTimestamp()
            });

            setProfile(newProfile);
          }
        } catch (error) {
          console.warn("Unable to fetch/initialize authenticating user profile safely (possibly offline):", error);
          setProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Guest Explorer',
            photoURL: user.photoURL,
            explorerLevel: 'Gold',
            availablePoints: 12400,
            totalTrips: 24,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isOffline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
