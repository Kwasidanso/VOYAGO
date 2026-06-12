import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './FirebaseProvider';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, serverTimestamp, arrayUnion, deleteDoc, getDoc, setDoc, where, increment } from 'firebase/firestore';
import { User, Camera, Mail, ShieldCheck, Trophy, ArrowLeft, Save, Loader2, CheckCircle2, PiggyBank, Plus, Wallet, History, Trash2, ArrowRight, TrendingUp, Calendar, X, Upload, Gift, Copy, Check, Users, Ticket, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useToast } from './ToastContext';
import confetti from 'canvas-confetti';

interface SavingsDeposit {
  amount: number;
  date: any;
  note: string;
}

interface SavingsGoal {
  id: string;
  goalTitle: string;
  targetAmount: number;
  currentAmount: number;
  status: 'active' | 'achieved' | 'paused';
  targetDate: string;
  deposits: SavingsDeposit[];
  createdAt: any;
}

interface RecentSearch {
  id: string;
  type: 'flight' | 'cruise';
  destination: string;
  origin?: string;
  date?: string;
  departurePort?: string;
  timestamp: any;
}

interface ReferralClaim {
  id: string;
  referrerUid: string;
  refereeUid: string;
  refereeName: string;
  pointsAwarded: number;
  status: 'pending' | 'claimed';
  createdAt: any;
}

export const Profile: React.FC = () => {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Celebrate Savings Goal Achieved with Confetti
  const triggerConfetti = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ['#8c001a', '#0453cd', '#10b981', '#f59e0b', '#3b82f6'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Camera Selfie State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          facingMode: 'user'
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Camera access denied. Please allow camera access in your browser settings, then try again. Note: If you are using an embedded iframe, you may need to open this app in a new tab.");
      } else {
        setCameraError("Unable to access camera: " + (err.message || "Please verify device inputs."));
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      const size = Math.min(video.videoWidth, video.videoHeight) || 400;
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        
        ctx.translate(400, 0);
        ctx.scale(-1, 1);
        
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
        
        const base64Str = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(base64Str);
      }
    }
  };

  const handleApplySelfie = async () => {
    if (!capturedImage || !profile) return;
    
    setIsUploading(true);
    try {
      setPhotoURL(capturedImage);
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { photoURL: capturedImage });
      
      setIsCameraOpen(false);
      stopCamera();
      
      setSaveStatus('success');
      showToast("Profile selfie updated successfully!", "success");
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error("Failed to save selfie:", error);
      showToast("Error saving selfie. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      // Stream cleanup
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);


  // Referrals State
  const [referrals, setReferrals] = useState<ReferralClaim[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [referralMessage, setReferralMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Savings Goals State
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  
  // Form States
  const [newGoal, setNewGoal] = useState({ title: '', target: 0, date: '' });
  const [newDeposit, setNewDeposit] = useState({ amount: 0, note: '' });
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const [isAddingDeposit, setIsAddingDeposit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'goal' | 'search' } | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhotoURL(profile.photoURL || '');
      setEmail(profile.email || '');

      // Listen for savings goals
      const goalsRef = collection(db, 'users', profile.uid, 'savingsGoals');
      const q = query(goalsRef);
      
      const unsubscribeGoals = onSnapshot(q, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavingsGoal[];
        setSavingsGoals(goals.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      });

      // Listen for recent searches from both flights and cruises
      const searchesRef = collection(db, 'users', profile.uid, 'recentSearches');
      const searchesQuery = query(searchesRef);
      
      const unsubscribeSearches = onSnapshot(searchesQuery, (snapshot) => {
        const searches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as RecentSearch[];
        setRecentSearches(searches.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
      });

      // Listen for referrals (where current user is the referrer)
      const referralsRef = collection(db, 'referrals');
      const referralsQuery = query(referralsRef, where('referrerUid', '==', profile.uid));
      
      const unsubscribeReferrals = onSnapshot(referralsQuery, (snapshot) => {
        const refs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ReferralClaim[];
        setReferrals(refs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      }, (error) => {
        console.error("Referral snapshot failed", error);
      });

      return () => {
        unsubscribeGoals();
        unsubscribeSearches();
        unsubscribeReferrals();
      };
    }
  }, [profile]);

  // Handle auto-initialization of referral code
  useEffect(() => {
    if (profile && !profile.referralCode) {
      const initReferral = async () => {
        try {
          const userCode = `VOYAGO-${profile.uid.substring(0, 5).toUpperCase()}`;
          const userRef = doc(db, 'users', profile.uid);
          await updateDoc(userRef, { referralCode: userCode });
          
          await setDoc(doc(db, 'referralCodes', userCode), {
            uid: profile.uid,
            displayName: profile.displayName || profile.email?.split('@')[0] || 'Voyago Explorer',
            createdAt: serverTimestamp()
          });
        } catch (error) {
          console.error("Failed to initialize referral code:", error);
        }
      };
      initReferral();
    }
  }, [profile]);

  const handleApplyReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !promoCodeInput.trim()) return;
    
    setApplyingCode(true);
    setReferralMessage(null);
    const code = promoCodeInput.trim().toUpperCase();
    
    try {
      if (profile.referralCode === code) {
        setReferralMessage({ text: "You cannot use your own referral code.", type: 'error' });
        setApplyingCode(false);
        return;
      }
      
      const codeSnap = await getDoc(doc(db, 'referralCodes', code));
      if (!codeSnap.exists()) {
        setReferralMessage({ text: "Referral code not found. Please verify it is correct.", type: 'error' });
        setApplyingCode(false);
        return;
      }
      
      const referralData = codeSnap.data();
      const referrerUid = referralData.uid;
      
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        referredBy: code,
        availablePoints: increment(1000)
      });
      
      const claimId = `${profile.uid}_${referrerUid}`;
      await setDoc(doc(db, 'referrals', claimId), {
        referrerUid,
        refereeUid: profile.uid,
        refereeName: profile.displayName || profile.email?.split('@')[0] || 'New Explorer',
        pointsAwarded: 2500,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      const notificationId = `ref_${profile.uid}_${Date.now()}`;
      await setDoc(doc(db, 'users', referrerUid, 'notifications', notificationId), {
        type: 'Referral',
        title: 'Referral Bonus Available!',
        message: `${profile.displayName || 'A friend'} used your code ${code}! You have a 2,500 points reward pending to claim in your Profile.`,
        read: false,
        createdAt: serverTimestamp()
      });
      
      setPromoCodeInput('');
      setReferralMessage({ text: "Success! You have been awarded 1,000 bonus points.", type: 'success' });
    } catch (error) {
      console.error("Error applying referral code:", error);
      setReferralMessage({ text: "An error occurred while applying the code.", type: 'error' });
    } finally {
      setApplyingCode(false);
    }
  };

  const handleClaimReferral = async (claimId: string, points: number) => {
    if (!profile) return;
    setClaimingId(claimId);
    try {
      await updateDoc(doc(db, 'referrals', claimId), {
        status: 'claimed'
      });
      
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        availablePoints: increment(points)
      });
      
      const notificationId = `claim_${claimId}_${Date.now()}`;
      await setDoc(doc(db, 'users', profile.uid, 'notifications', notificationId), {
        type: 'Notification',
        title: 'Points Claimed!',
        message: `You successfully claimed a +${points} points referral reward!`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to claim referral points:", error);
    } finally {
      setClaimingId(null);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'recentSearches', searchId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete search', error);
    }
  };

  const handleCreateGoal = async () => {
    if (!profile || !newGoal.title || newGoal.target <= 0) return;
    setIsCreatingGoal(true);
    try {
      const goalsRef = collection(db, 'users', profile.uid, 'savingsGoals');
      await addDoc(goalsRef, {
        goalTitle: newGoal.title,
        targetAmount: newGoal.target,
        currentAmount: 0,
        status: 'active',
        targetDate: newGoal.date,
        deposits: [],
        createdAt: serverTimestamp()
      });
      setShowAddGoal(false);
      setNewGoal({ title: '', target: 0, date: '' });
    } catch (error) {
      console.error('Failed to create goal', error);
    } finally {
      setIsCreatingGoal(false);
    }
  };

  const handleAddDeposit = async (goalId: string, amount: number, note: string) => {
    if (!profile || amount <= 0) return;
    setIsAddingDeposit(true);
    try {
      const goalRef = doc(db, 'users', profile.uid, 'savingsGoals', goalId);
      const goal = savingsGoals.find(g => g.id === goalId);
      if (!goal) return;

      const deposit: SavingsDeposit = {
        amount,
        date: new Date().toISOString(), // Using ISO string for simplicity in rules check if needed, though blueprint says date-time
        note: note || 'Manual deposit'
      };

      const newCurrentAmount = goal.currentAmount + amount;
      const newStatus = newCurrentAmount >= goal.targetAmount ? 'achieved' : goal.status;

      await updateDoc(goalRef, {
        currentAmount: newCurrentAmount,
        deposits: arrayUnion(deposit),
        status: newStatus
      });
      
      setNewDeposit({ amount: 0, note: '' });
      if (selectedGoal?.id === goalId) {
        setSelectedGoal(prev => prev ? {
          ...prev,
          currentAmount: newCurrentAmount,
          deposits: [...prev.deposits, deposit],
          status: newStatus
        } : null);
      }

      // If status changed to achieved, trigger confetti and celebratory toast
      if (newStatus === 'achieved' && goal.status !== 'achieved') {
        triggerConfetti();
        showToast(`Congratulations! You achieved your savings goal: "${goal.goalTitle}"! 🥳🎉`, "success", 5000);
      } else {
        showToast(`Successfully deposited $${amount.toLocaleString()}!`, "success");
      }
    } catch (error) {
      console.error('Failed to add deposit', error);
    } finally {
      setIsAddingDeposit(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!profile) return;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'savingsGoals', goalId));
      if (selectedGoal?.id === goalId) setSelectedGoal(null);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete goal', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        displayName,
        photoURL,
        email
      });
      setSaveStatus('success');
      showToast("Profile updated successfully!", "success");
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to update profile', error);
      showToast("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 800KB for base64 storage in Firestore)
    if (file.size > 800000) {
      showToast("Image is too large. Please select an image under 800KB.", "warning");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoURL(base64String);
      setIsUploading(false);
      showToast("Photo selected! Click 'Save Changes' at the bottom to apply.", "info");
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!profile || !user) return null;

  return (
    <main className="pt-32 pb-24 px-8 max-w-4xl mx-auto">
      <div className="mb-12 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 text-on-surface-variant hover:text-secondary transition-colors font-bold text-sm">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Your Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Tier */}
        <div className="md:col-span-4 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center flex flex-col items-center border border-slate-100">
            <div className="relative group cursor-pointer" onClick={triggerFileUpload}>
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-secondary-fixed mb-6 relative">
                <img 
                  src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
                  className="w-full h-full object-cover" 
                  alt="Avatar" 
                />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={24} />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-3 text-white">
                  <Camera size={24} />
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{profile.displayName}</h2>
            <p className="text-sm text-on-surface-variant mb-6">{profile.email}</p>
            <div className="w-full pt-6 border-t border-slate-100 flex justify-around mb-6">
               <div className="text-center">
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Trips</p>
                 <p className="font-headline font-bold text-secondary">{profile.totalTrips}</p>
               </div>
               <div className="text-center border-x border-slate-100 px-6">
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Points</p>
                 <p className="font-headline font-bold text-secondary">{profile.availablePoints.toLocaleString()}</p>
               </div>
            </div>

            <Link 
              to="/dashboard" 
              onClick={() => {
                setTimeout(() => {
                  const element = document.getElementById('past-bookings');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }, 300);
              }}
              className="w-full flex items-center justify-center gap-3 bg-on-surface text-white py-4 rounded-2xl font-headline font-black text-xs uppercase tracking-widest hover:bg-secondary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-on-surface/10"
            >
              <Calendar size={18} className="text-secondary" />
              Manage My Bookings
            </Link>
          </div>

          <div className="bg-secondary rounded-3xl p-8 text-white shadow-xl overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Trophy size={24} className="text-tertiary-fixed" />
                <h3 className="font-headline font-bold uppercase tracking-widest text-xs">Membership Tier</h3>
              </div>
              <p className="text-3xl font-headline font-black mb-2">{profile.explorerLevel}</p>
              <p className="text-white/60 text-xs">Status verified via Voyago Concierge</p>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-10">
               <ShieldCheck size={120} />
            </div>
          </div>
        </div>

        {/* Right Column: Information Form */}
        <div className="md:col-span-8 bg-white rounded-3xl p-10 shadow-xl border border-slate-100 h-fit">
          <h3 className="font-headline font-bold text-xl mb-8">Personal Details</h3>
          
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                <User size={12} className="text-secondary" />
                Display Name
              </label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 border border-transparent focus:border-secondary/30 transition-all"
                placeholder="What should we call you?"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                <Camera size={12} className="text-secondary" />
                Profile Image
              </label>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img 
                    src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} 
                    className="w-full h-full object-cover"
                    alt="Preview"
                  />
                </div>
                <div className="flex-1 w-full space-y-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={triggerFileUpload}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer"
                    >
                      <Upload size={14} />
                      Upload Photo
                    </button>
                    <button 
                      onClick={() => setIsCameraOpen(true)}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      <Camera size={14} />
                      Take Selfie
                    </button>
                    <button 
                      onClick={() => setPhotoURL('')}
                      className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 rounded-lg text-[10px] font-mono text-on-surface-variant border border-slate-100 focus:outline-none"
                    placeholder="Or paste an image URL..."
                  />
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant ml-1 font-medium">Recommended: Square image, max 800KB.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} className="text-secondary" />
                Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-surface-container-low rounded-2xl text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 border border-transparent focus:border-secondary/30 transition-all"
                placeholder="you@example.com"
              />
              <p className="text-[10px] text-on-surface-variant ml-2">Note: This updates your profile contact information.</p>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-10 py-4 rounded-full font-headline font-bold text-lg transition-all shadow-xl",
                  saveStatus === 'success' 
                    ? "bg-green-600 text-white" 
                    : "bg-secondary text-white hover:scale-105 active:scale-95 disabled:opacity-50"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Saving...
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={20} />
                    Profile Updated
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Travel Savings Section */}
          <div className="mt-8 bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                  <PiggyBank className="text-secondary" />
                  Travel Savings
                </h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Save towards your next big voyage</p>
              </div>
              <button 
                onClick={() => setShowAddGoal(true)}
                className="p-3 bg-secondary/10 text-secondary rounded-full hover:bg-secondary hover:text-white transition-all shadow-sm"
              >
                <Plus size={20} />
              </button>
            </div>

            {savingsGoals.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
                  <TrendingUp size={32} />
                </div>
                <p className="text-slate-500 font-bold text-sm mb-2">No active savings goals</p>
                <button 
                  onClick={() => setShowAddGoal(true)}
                  className="text-secondary text-xs font-black uppercase tracking-widest hover:underline"
                >
                  Start Saving Today
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savingsGoals.map(goal => {
                  const progress = (goal.currentAmount / goal.targetAmount) * 100;
                  return (
                    <div 
                      key={goal.id} 
                      className="group p-6 rounded-3xl bg-surface-container-low border border-slate-100 hover:border-secondary transition-all cursor-default relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-on-surface mb-1 group-hover:text-secondary transition-colors">{goal.goalTitle}</h4>
                          <p className="text-[10px] text-on-surface-variant font-medium flex items-center gap-2">
                            <Calendar size={10} />
                            Target: {goal.targetDate || 'Flexible'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGoal(goal);
                            }}
                            className="p-2 bg-white rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/5 transition-all"
                            title="Manage Goal"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end text-xs">
                          <span className="font-black text-on-surface">${goal.currentAmount.toLocaleString()} <span className="text-[10px] text-on-surface-variant font-medium">saved</span></span>
                          <span className="text-on-surface-variant font-bold">${goal.targetAmount.toLocaleString()} <span className="text-[10px]">goal</span></span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className={cn(
                              "h-full rounded-full transition-colors",
                              progress >= 100 ? "bg-green-500" : "bg-secondary"
                            )}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                          <span className={cn(progress >= 100 ? "text-green-600" : "text-secondary")}>
                            {progress.toFixed(0)}% Complete
                          </span>
                          <span className="text-on-surface-variant">
                            ${(goal.targetAmount - goal.currentAmount).toLocaleString()} left
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Searches Section */}
          <div className="mt-8 bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-headline font-bold text-xl flex items-center gap-2">
                  <History className="text-secondary" />
                  Recent Searches
                </h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Quickly jump back into your journey</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Flights Searches */}
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   Flight History
                </h4>
                <div className="space-y-3">
                  {recentSearches.filter(s => s.type === 'flight').slice(0, 4).length > 0 ? (
                    recentSearches.filter(s => s.type === 'flight').slice(0, 4).map(search => (
                      <div key={search.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-all">
                        <Link 
                          to={`/flights?origin=${encodeURIComponent(search.origin || '')}&dest=${encodeURIComponent(search.destination)}`}
                          className="flex-1 flex flex-col"
                        >
                          <span className="text-xs font-bold text-on-surface">{search.origin} → {search.destination}</span>
                          <span className="text-[8px] text-on-surface-variant font-medium uppercase tracking-tight">{search.date}</span>
                        </Link>
                        <button 
                          onClick={() => setDeleteConfirm({ id: search.id, type: 'search' })}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-medium italic">No recent flight searches</p>
                  )}
                </div>
              </div>

              {/* Cruise Searches */}
              <div>
                <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   Cruise History
                </h4>
                <div className="space-y-3">
                  {recentSearches.filter(s => s.type === 'cruise').slice(0, 4).length > 0 ? (
                    recentSearches.filter(s => s.type === 'cruise').slice(0, 4).map(search => (
                      <div key={search.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-all">
                        <Link 
                          to={`/cruises?dest=${encodeURIComponent(search.destination)}&port=${encodeURIComponent(search.departurePort || '')}`}
                          className="flex-1 flex flex-col"
                        >
                          <span className="text-xs font-bold text-on-surface">{search.destination}</span>
                          <span className="text-[8px] text-on-surface-variant font-medium uppercase tracking-tight">From {search.departurePort}</span>
                        </Link>
                        <button 
                          onClick={() => setDeleteConfirm({ id: search.id, type: 'search' })}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 font-medium italic">No recent cruise searches</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Refer & Earn Rewards Section */}
          <div className="mt-8 bg-white rounded-3xl p-10 shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl flex items-center gap-2 text-on-surface">
                  Refer &amp; Earn
                </h3>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Get points for inviting friends to Voyago</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* My Share Card */}
              <div className="bg-surface-container-low p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-on-surface mb-2 uppercase tracking-wide flex items-center gap-2">
                    <Share2 size={14} className="text-secondary" />
                    Share Your Code
                  </h4>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                    Friends get <strong className="text-secondary">1,000 pts</strong> on signup, and you receive <strong className="text-secondary">2,500 pts</strong> once they apply your code!
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Code Display */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Your Referral Code</p>
                      <p className="font-mono font-bold text-md text-on-surface select-all">{profile.referralCode || 'GENERATING...'}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (profile.referralCode) {
                          navigator.clipboard.writeText(profile.referralCode);
                          setIsCopied(true);
                          setTimeout(() => setIsCopied(false), 2000);
                        }
                      }}
                      className="p-3 bg-slate-50 hover:bg-secondary/10 hover:text-secondary text-on-surface-variant rounded-xl transition-all"
                      title="Copy Code"
                    >
                      {isCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* Copy Link Button */}
                  <button
                    onClick={() => {
                      if (profile.referralCode) {
                        const link = `${window.location.origin}/auth?ref=${profile.referralCode}`;
                        navigator.clipboard.writeText(link);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }
                    }}
                    className="w-full py-4 px-6 bg-secondary text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-secondary/90 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Copy size={14} />
                    Copy Invitation Link
                  </button>
                </div>
              </div>

              {/* Enter Promo Code Card */}
              <div className="bg-surface-container-low p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black text-on-surface mb-2 uppercase tracking-wide flex items-center gap-2">
                    <Ticket size={14} className="text-secondary" />
                    Enter Referral Code
                  </h4>
                  <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                    Were you referred by an explorer friend? Enter their code below to receive your 1,000 points signup bonus!
                  </p>
                </div>

                {profile.referredBy ? (
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center">
                    <CheckCircle2 className="text-green-600 mx-auto mb-2" size={24} />
                    <p className="text-xs font-bold text-green-800">Successfully Referred!</p>
                    <p className="text-[10px] text-green-600 mt-1">Referred by code: {profile.referredBy}</p>
                  </div>
                ) : (
                  <form onSubmit={handleApplyReferralCode} className="space-y-4">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      placeholder="e.g. VOYAGO-ABCDE"
                      disabled={applyingCode}
                      className="w-full px-5 py-4 bg-white rounded-2xl text-on-surface font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-secondary/20 border border-slate-100 focus:border-secondary/30 transition-all text-center"
                    />

                    {referralMessage && (
                      <p className={cn(
                        "text-[11px] font-bold text-center leading-relaxed",
                        referralMessage.type === 'success' ? "text-green-600" : "text-red-500"
                      )}>
                        {referralMessage.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={applyingCode || !promoCodeInput.trim()}
                      className="w-full py-4 px-6 bg-on-surface text-white hover:bg-secondary text-xs font-black uppercase tracking-wider rounded-2xl disabled:opacity-50 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {applyingCode ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                      Apply Code &amp; Claim 1,000 pts
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Friend Referrals List */}
            <div className="border-t border-slate-100 pt-8">
              <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Users size={12} className="text-secondary" />
                Referral History &amp; Claim Board
              </h4>

              {referrals.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold text-xs">No referrals yet</p>
                  <p className="text-[10px] text-slate-400 mt-1">Invite friends to Voyago and see them listed here!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map(ref => (
                    <div 
                      key={ref.id} 
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 text-secondary rounded-xl font-headline font-bold text-xs uppercase">
                          {ref.refereeName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-on-surface">{ref.refereeName}</p>
                          <p className="text-[8px] text-on-surface-variant font-medium">Joined using your link</p>
                        </div>
                      </div>

                      <div>
                        {ref.status === 'pending' ? (
                          <button
                            onClick={() => handleClaimReferral(ref.id, ref.pointsAwarded)}
                            disabled={claimingId === ref.id}
                            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                          >
                            {claimingId === ref.id ? (
                              <Loader2 className="animate-spin" size={10} />
                            ) : (
                              <Plus size={10} />
                            )}
                            Claim +{ref.pointsAwarded} pts
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100 flex items-center gap-1">
                            <Check size={10} />
                            Claimed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-3xl p-8 flex flex-col items-center text-center"
            >
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Are you sure?</h3>
              <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
                This action cannot be undone. This {deleteConfirm.type === 'goal' ? 'savings goal' : 'search history'} will be permanently removed.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-slate-50 text-on-surface font-bold text-sm hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deleteConfirm.type === 'goal' ? handleDeleteGoal(deleteConfirm.id) : handleDeleteSearch(deleteConfirm.id)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all font-headline"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-24">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddGoal(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-headline font-black text-on-surface">New Goal</h2>
                  <button onClick={() => setShowAddGoal(false)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Goal Title</label>
                    <input 
                      type="text"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                      placeholder="e.g., Summer in Santorini"
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-secondary/20 outline-none border border-transparent focus:border-secondary/20 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Target Amount ($)</label>
                      <input 
                        type="number"
                        value={newGoal.target || ''}
                        onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                        placeholder="5000"
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-secondary/20 outline-none border border-transparent focus:border-secondary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Target Date</label>
                      <input 
                        type="date"
                        value={newGoal.date}
                        onChange={(e) => setNewGoal({...newGoal, date: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-on-surface font-medium focus:ring-2 focus:ring-secondary/20 outline-none border border-transparent focus:border-secondary/20 transition-all text-xs"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateGoal}
                    disabled={isCreatingGoal || !newGoal.title || newGoal.target <= 0}
                    className="w-full py-5 bg-secondary text-white rounded-2xl font-headline font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                  >
                    {isCreatingGoal ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Create Savings Goal'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Details Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-12 md:p-24 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGoal(null)}
              className="fixed inset-0 bg-on-surface/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
                      <PiggyBank size={24} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-headline font-black text-on-surface leading-tight">{selectedGoal.goalTitle}</h2>
                      <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-1">Goal Status: {selectedGoal.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setDeleteConfirm({ id: selectedGoal.id, type: 'goal' })}
                      className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      title="Delete Goal"
                    >
                      <Trash2 size={20} />
                    </button>
                    <button onClick={() => setSelectedGoal(null)} className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:bg-slate-100 transition-all shadow-sm">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Stats Column */}
                  <div className="md:col-span-1 space-y-6">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Savings Progress</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <span className="text-2xl font-headline font-black text-on-surface">${selectedGoal.currentAmount.toLocaleString()}</span>
                           <span className="text-xs font-bold text-on-surface-variant">${selectedGoal.targetAmount.toLocaleString()} goal</span>
                        </div>
                        <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((selectedGoal.currentAmount / selectedGoal.targetAmount) * 100, 100)}%` }}
                            className="h-full bg-secondary rounded-full"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-secondary">
                          <span>{((selectedGoal.currentAmount / selectedGoal.targetAmount) * 100).toFixed(1)}% achieved</span>
                          <span className="text-on-surface-variant">${(selectedGoal.targetAmount - selectedGoal.currentAmount).toLocaleString()} remaining</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-secondary/5 rounded-3xl border border-secondary/10">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Wallet size={12} />
                        Make a Deposit
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <input 
                            type="number"
                            value={newDeposit.amount || ''}
                            onChange={(e) => setNewDeposit({...newDeposit, amount: Number(e.target.value)})}
                            placeholder="Amount ($)"
                            className="w-full px-4 py-3 bg-white rounded-xl text-on-surface font-bold focus:ring-2 focus:ring-secondary/20 outline-none border border-slate-100 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="text"
                            value={newDeposit.note}
                            onChange={(e) => setNewDeposit({...newDeposit, note: e.target.value})}
                            placeholder="Deposit note..."
                            className="w-full px-4 py-3 bg-white rounded-xl text-on-surface text-xs focus:ring-2 focus:ring-secondary/20 outline-none border border-slate-100 transition-all font-medium"
                          />
                        </div>
                        <button 
                          onClick={() => handleAddDeposit(selectedGoal.id, newDeposit.amount, newDeposit.note)}
                          disabled={isAddingDeposit || newDeposit.amount <= 0}
                          className="w-full py-4 bg-secondary text-white rounded-xl font-bold text-xs shadow-lg shadow-secondary/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isAddingDeposit ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirm Deposit'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Deposits Table Column */}
                  <div className="md:col-span-2">
                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden min-h-[400px] flex flex-col shadow-sm">
                      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <History size={16} className="text-on-surface-variant" />
                        <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Deposit Transaction History</h4>
                      </div>
                      
                      <div className="flex-1 overflow-x-auto">
                        {selectedGoal.deposits.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400">
                            <Wallet size={32} className="mb-4 opacity-20" />
                            <p className="text-xs font-medium">No deposits recorded yet</p>
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-slate-50/50">Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-slate-50/50">Note</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-slate-50/50 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedGoal.deposits.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((dep, di) => (
                                <tr key={di} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-none">
                                  <td className="px-6 py-4 text-xs text-on-surface-variant font-medium">
                                    {new Date(dep.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-on-surface font-bold">
                                    {dep.note}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-secondary font-black text-right">
                                    +${dep.amount.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Selfie Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCameraOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden z-10 border border-slate-100"
            >
              <div className="p-8 flex flex-col items-center font-sans">
                <div className="flex items-center justify-between w-full mb-6">
                  <div>
                    <h3 className="text-xl font-headline font-black text-on-surface">Capture Selfie</h3>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Voyago Selfie Station</p>
                  </div>
                  <button 
                    onClick={() => setIsCameraOpen(false)} 
                    className="p-2.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {cameraError ? (
                  <div className="w-full py-8 px-6 bg-red-50 rounded-2xl border border-red-100 text-center space-y-4">
                    <p className="text-red-700 text-xs font-semibold leading-relaxed">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors uppercase tracking-widest cursor-pointer"
                    >
                      Retry Camera Access
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-6">
                    {/* Viewport Frame */}
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-secondary shadow-lg bg-black flex items-center justify-center">
                      {!capturedImage ? (
                        <>
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover scale-x-[-1]" 
                          />
                          {/* Face guidance outline overlay */}
                          <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full pointer-events-none flex items-center justify-center m-4">
                            <div className="w-11/12 h-11/12 rounded-full border-2 border-dashed border-secondary/40 flex items-center justify-center">
                              <div className="text-white/40 text-[9px] font-bold tracking-wider uppercase text-center max-w-[120px]">
                                Align face inside circle
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <img 
                          src={capturedImage} 
                          alt="Captured snap" 
                          className="w-full h-full object-cover" 
                        />
                      )}
                    </div>

                    {/* Camera Control Panel */}
                    <div className="w-full flex justify-center gap-4 pt-2">
                      {!capturedImage ? (
                        <button
                          onClick={takePhoto}
                          className="flex items-center justify-center gap-3 px-8 py-4 bg-secondary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-secondary/90 hover:scale-[1.02] active:scale-95 transition-all w-full cursor-pointer shadow-lg shadow-secondary/15 font-headline"
                        >
                          <Camera size={16} />
                          Capture Photo
                        </button>
                      ) : (
                        <div className="flex gap-3 w-full">
                          <button
                            onClick={() => {
                              setCapturedImage(null);
                              startCamera();
                            }}
                            className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-all cursor-pointer font-headline"
                          >
                            Retake
                          </button>
                          <button
                            onClick={handleApplySelfie}
                            disabled={isUploading}
                            className="flex-1 py-4 px-6 rounded-2xl bg-green-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-green-700 shadow-lg shadow-green-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer font-headline"
                          >
                            {isUploading ? (
                              <Loader2 className="animate-spin text-white" size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Use Selfie
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
