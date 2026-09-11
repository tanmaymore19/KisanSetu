import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole, FarmingStyle } from '../types.js';
import { api } from '../lib/api.js';
import { getAccurateLocationWithAddress } from '../lib/geo.js';
import { FarmPhotoUpload } from './FarmPhotoUpload.js';
import {
  Sprout,
  ShoppingBag,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  MapPin,
  Trees,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Plus,
  X,
  Compass,
  KeyRound,
  ArrowRight,
  Check,
  Camera,
} from 'lucide-react';

interface AuthScreenProps {
  role: UserRole;
  onBackToRoleSelect: () => void;
}

const PREDEFINED_CROPS = [
  'Tomato',
  'Spinach (Palak)',
  'Carrot',
  'Potato',
  'Onion',
  'Cauliflower',
  'Cabbage',
  'Capsicum',
  'Green Chilli',
  'Apple',
  'Mango',
  'Banana',
  'Strawberry',
  'Guava',
  'Pomegranate',
  'Papaya',
  'Lemon',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({ role, onBackToRoleSelect }) => {
  const { login, register, saveSession, isLoading, quickDemoLogin, setSelectedRoleForAuth } = useAuth();

  // Mode: 'login' | 'register' | 'forgot_password'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Success state for newly created real account (to verify & test login immediately)
  const [createdUserSuccess, setCreatedUserSuccess] = useState<{
    fullName: string;
    username: string;
    email: string;
    role: UserRole;
    sessionToken: string;
    userObj: any;
  } | null>(null);

  // Login inputs - auto-fills last username if available
  const [loginIdentifier, setLoginIdentifier] = useState(() => {
    try {
      return localStorage.getItem('f2h_last_username') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password inputs
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [generatedOtpHint, setGeneratedOtpHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Register inputs - Common
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Register inputs - Farmer specific multi-step
  const [farmerStep, setFarmerStep] = useState<1 | 2 | 3 | 4>(1);
  const [farmName, setFarmName] = useState('');
  const [farmAddress, setFarmAddress] = useState('');
  const [farmSize, setFarmSize] = useState('10');
  const [farmSizeUnit, setFarmSizeUnit] = useState<'acre' | 'hectare' | 'bigha'>('acre');
  const [farmType, setFarmType] = useState('Organic Farm');
  const [experienceYears, setExperienceYears] = useState('8');
  const [farmingStyle, setFarmingStyle] = useState<FarmingStyle>('Organic');
  const [farmPhotos, setFarmPhotos] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([
    'Tomato',
    'Spinach (Palak)',
    'Strawberry',
  ]);
  const [customCropInput, setCustomCropInput] = useState('');
  const [farmLat, setFarmLat] = useState('18.5204');
  const [farmLng, setFarmLng] = useState('73.8567');
  const [isDetectingFarmerGps, setIsDetectingFarmerGps] = useState(false);
  const [farmerGpsAccuracy, setFarmerGpsAccuracy] = useState<number | null>(null);

  // Register inputs - Consumer specific
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('Pune');
  const [deliveryPincode, setDeliveryPincode] = useState('411045');
  const [consumerLat, setConsumerLat] = useState<number | null>(null);
  const [consumerLng, setConsumerLng] = useState<number | null>(null);
  const [consumerLocationLabel, setConsumerLocationLabel] = useState<string>('');
  const [isDetectingConsumerGps, setIsDetectingConsumerGps] = useState(false);
  const [consumerGpsAccuracy, setConsumerGpsAccuracy] = useState<number | null>(null);

  // Fast autofill for demo testing
  const autofillDemo = (type: 'farmer' | 'consumer') => {
    setError(null);
    if (type === 'farmer') {
      setLoginIdentifier('rajesh_farmer');
      setLoginPassword('Farmer@123');
    } else {
      setLoginIdentifier('tanmay123');
      setLoginPassword('Consumer@123');
    }
  };

  const handleQuickDemoLogin = async (username: 'rajesh_farmer' | 'anita_orchards' | 'tanmay123') => {
    setError(null);
    try {
      await quickDemoLogin(username);
    } catch (err: any) {
      setError(err.message || 'Quick login failed. Please enter credentials.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const id = loginIdentifier.trim();
    const pass = loginPassword.trim();
    if (!id || !pass) {
      setError('Please enter both your identifier (username, email, or phone) and password.');
      return;
    }
    try {
      await login(id, pass, role);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    }
  };

  const handleAddCustomCrop = () => {
    const trimmed = customCropInput.trim();
    if (trimmed && !selectedCrops.includes(trimmed)) {
      setSelectedCrops([...selectedCrops, trimmed]);
      setCustomCropInput('');
    }
  };

  const handleRemoveCrop = (crop: string) => {
    setSelectedCrops(selectedCrops.filter((c) => c !== crop));
  };

  const handleDetectCoordinates = async () => {
    setIsDetectingFarmerGps(true);
    setError(null);
    try {
      const accurate = await getAccurateLocationWithAddress({
        targetAccuracy: 15,
        maxWaitMs: 7500,
        fallbackToIp: true,
      });
      setFarmLat(String(accurate.lat));
      setFarmLng(String(accurate.lng));
      if (!farmAddress || farmAddress.includes('Countryside')) {
        setFarmAddress(accurate.formattedAddress);
      }
      setFarmerGpsAccuracy(accurate.accuracy);
      setSuccessMessage(`Farm GPS locked with ±${accurate.accuracy}m accuracy!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Could not acquire farm GPS location.');
    } finally {
      setIsDetectingFarmerGps(false);
    }
  };

  const handleDetectConsumerCoordinates = async () => {
    setIsDetectingConsumerGps(true);
    setError(null);
    try {
      const accurate = await getAccurateLocationWithAddress({
        targetAccuracy: 15,
        maxWaitMs: 7500,
        fallbackToIp: true,
      });
      setDeliveryStreet(accurate.formattedAddress);
      if (accurate.city) setDeliveryCity(accurate.city);
      if (accurate.pincode) setDeliveryPincode(accurate.pincode);
      setConsumerLat(accurate.lat);
      setConsumerLng(accurate.lng);
      setConsumerLocationLabel(accurate.label);
      setConsumerGpsAccuracy(accurate.accuracy);
      setSuccessMessage(`Address autofilled from GPS (±${accurate.accuracy}m accuracy)!`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Could not acquire GPS address.');
    } finally {
      setIsDetectingConsumerGps(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const u = username.trim();
    if (u.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      let regPayload: any;
      if (role === 'farmer') {
        if (farmPhotos.length === 0) {
          setError('Farms pictures upload is mandatory. Please upload at least one photo of your farm from your device.');
          setFarmerStep(4);
          return;
        }

        regPayload = {
          role: 'farmer',
          username: u,
          email: email.trim(),
          password: regPassword,
          fullName: fullName.trim(),
          phone: mobile.trim(),
          farmDetails: {
            farmName: farmName.trim() || `${fullName.trim()}'s Farm`,
            locationAddress: farmAddress.trim() || 'Village Green Meadows',
            lat: parseFloat(farmLat) || 18.5204,
            lng: parseFloat(farmLng) || 73.8567,
            farmSize: parseFloat(farmSize) || 5,
            farmSizeUnit,
            farmType,
            experienceYears: parseInt(experienceYears, 10) || 5,
            farmingStyle,
            cropsGrown: selectedCrops,
            bio: `${farmingStyle} farm dedicated to fresh harvest for local families.`,
            bannerImage: farmPhotos[0] || 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&q=80',
            farmPhotos: farmPhotos,
          },
        };
      } else {
        regPayload = {
          role: 'consumer',
          username: u,
          email: email.trim(),
          password: regPassword,
          fullName: fullName.trim(),
          phone: mobile.trim(),
          deliveryAddress: {
            street: deliveryStreet || '12 Lotus Lane',
            city: deliveryCity || 'Pune',
            state: 'Maharashtra',
            pincode: deliveryPincode || '411045',
            lat: consumerLat || 18.5590,
            lng: consumerLng || 73.7868,
            label: consumerLocationLabel || (deliveryCity ? `${deliveryCity}, Maharashtra` : 'Pune, Maharashtra'),
          },
        };
      }

      const res = await api.register(regPayload);

      try {
        localStorage.setItem('f2h_last_username', res.user.username);
      } catch {}

      setLoginIdentifier(res.user.username);
      setLoginPassword('');

      setCreatedUserSuccess({
        fullName: res.user.fullName,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role,
        sessionToken: res.token,
        userObj: res.user,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  // Forgot password flow
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.requestPasswordReset(forgotIdentifier);
      setGeneratedOtpHint(res.demoOtp);
      setForgotStep(2);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Could not find account.');
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.confirmPasswordReset({
        identifier: forgotIdentifier,
        otp: forgotOtp,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      setSuccessMessage(res.message);
      setMode('login');
      setLoginIdentifier(forgotIdentifier);
      setLoginPassword('');
      setForgotStep(1);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    }
  };

  const isFarmer = role === 'farmer';

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col justify-between p-4 font-sans text-[#2D3A26]">
      {/* Header with Back button */}
      <div className="w-full max-w-md mx-auto pt-2">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onBackToRoleSelect}
            className="flex items-center gap-1 text-xs font-semibold text-[#2D3A26] bg-[#FAF8F5] hover:bg-[#F1EDE4] px-3 py-1.5 rounded-full border border-[#E5E0D5] transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#5D7A4F]" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="font-serif font-extrabold text-sm text-[#2D3A26]">KisanSetu</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isFarmer
                  ? 'bg-[#EBF1E8] text-[#5D7A4F] border border-[#D4CDBC]'
                  : 'bg-[#F1EDE4] text-[#2D3A26] border border-[#E5E0D5]'
              }`}
            >
              {isFarmer ? '🌾 Farmer Portal' : '🛒 Consumer Portal'}
            </span>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F1EDE4] rounded-xl mb-3 border border-[#E5E0D5]">
          <button
            type="button"
            onClick={() => {
              setSelectedRoleForAuth('farmer');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isFarmer ? 'bg-[#5D7A4F] text-white shadow-xs' : 'text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" /> Farmer Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedRoleForAuth('consumer');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              !isFarmer ? 'bg-[#8A9A5B] text-white shadow-xs' : 'text-[#5D6D56] hover:text-[#2D3A26]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Consumer Portal
          </button>
        </div>

        {/* Hero Scenic Banner matching mockup */}
        <div className="relative w-full h-36 rounded-2xl overflow-hidden shadow-xs border border-[#E5E0D5] mb-4">
          <img
            src={
              isFarmer
                ? 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?w=800&q=80'
                : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
            }
            alt="Scenic Background"
            className="w-full h-full object-cover brightness-90"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-3.5 text-white">
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                  isFarmer ? 'bg-[#5D7A4F]' : 'bg-[#8A9A5B]'
                }`}
              >
                {isFarmer ? <Sprout className="w-5 h-5 text-white" /> : <ShoppingBag className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight drop-shadow-xs font-serif">
                  {mode === 'login'
                    ? isFarmer
                      ? 'Welcome Back, Farmer! 🌾'
                      : 'Welcome Back! 🥕'
                    : mode === 'register'
                    ? isFarmer
                      ? 'Register Your Farm'
                      : 'Create Consumer Account'
                    : 'Account Verification'}
                </h2>
                <p className="text-[11px] text-[#FAF8F5] line-clamp-1">
                  {isFarmer
                    ? 'Login to manage your farm, products and orders'
                    : 'Login to discover fresh produce from nearby farms'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#EBF1E8] border border-[#D4CDBC] text-[#2D3A26] text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#5D7A4F]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= CREATED USER CONFIRMATION SCREEN ================= */}
        {createdUserSuccess ? (
          <div className="bg-[#FAF8F5] rounded-2xl p-5 shadow-sm border-2 border-[#5D7A4F]/40 animate-fadeIn text-left">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#2D3A26] font-serif">
                Real Account Created in Database!
              </h3>
              <p className="text-xs text-[#5D6D56] mt-0.5">
                Your new account has been registered with PBKDF2 password encryption.
              </p>
            </div>

            {/* Account Card */}
            <div className="p-3.5 bg-white rounded-xl border border-[#E5E0D5] text-xs space-y-2 mb-4 shadow-2xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#F1EDE4]">
                <span className="text-[#8C9886] font-medium">Full Name:</span>
                <span className="font-bold text-[#2D3A26]">{createdUserSuccess.fullName}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#F1EDE4]">
                <span className="text-[#8C9886] font-medium">Username:</span>
                <span className="font-mono font-bold text-[#5D7A4F]">@{createdUserSuccess.username}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#F1EDE4]">
                <span className="text-[#8C9886] font-medium">Email:</span>
                <span className="font-medium text-[#2D3A26]">{createdUserSuccess.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8C9886] font-medium">Account Role:</span>
                <span className="font-semibold text-[#2D3A26] px-2 py-0.5 rounded-md bg-[#EBF1E8] text-[#5D7A4F]">
                  {createdUserSuccess.role === 'farmer' ? '🌾 Farmer' : '🛒 Consumer'}
                </span>
              </div>
            </div>

            {/* Actions: Test Login or Enter Directly */}
            <div className="space-y-2.5">
              <button
                id="test-new-account-login-btn"
                type="button"
                onClick={() => {
                  const uname = createdUserSuccess.username;
                  setCreatedUserSuccess(null);
                  setMode('login');
                  setLoginIdentifier(uname);
                  setLoginPassword('');
                  setSuccessMessage(`Account @${uname} created! Type your password below to test logging in.`);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white border-2 border-[#5D7A4F] text-[#2D3A26] font-bold text-xs hover:bg-[#F1EDE4] transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-[#5D7A4F]" />
                Test Login with this Account
              </button>

              <button
                id="enter-dashboard-now-btn"
                type="button"
                onClick={() => {
                  saveSession(createdUserSuccess.sessionToken, createdUserSuccess.userObj);
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  isFarmer ? 'bg-[#5D7A4F] hover:bg-[#4B633F]' : 'bg-[#8A9A5B] hover:bg-[#78884d]'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                Enter {isFarmer ? 'Farmer Portal' : 'Consumer Portal'} Directly
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Navigation Tabs: Login vs Create Real Account */}
            {mode !== 'forgot_password' && (
              <div className="grid grid-cols-2 p-1 bg-[#F1EDE4] rounded-xl mb-3 border border-[#E5E0D5]">
                <button
                  id="tab-mode-login"
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#2D3A26] shadow-2xs'
                      : 'text-[#5D6D56] hover:text-[#2D3A26]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Login to Account
                </button>
                <button
                  id="tab-mode-register"
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#2D3A26] shadow-2xs'
                      : 'text-[#5D6D56] hover:text-[#2D3A26]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5D7A4F]" />
                  Create Real Account
                </button>
              </div>
            )}

            {/* ================= MODE 1: LOGIN ================= */}
            {mode === 'login' && (
              <div className="bg-[#FAF8F5] rounded-2xl p-5 shadow-xs border border-[#E5E0D5]">
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  {/* Username, Email, or Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                      Email, Username, or Mobile
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#8C9886] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-identifier-input"
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Enter your username, email, or mobile"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#E5E0D5] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F] transition-all bg-white text-[#2D3A26]"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#2D3A26]">Password</label>
                      <button
                        id="forgot-password-link"
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className="text-[11px] font-medium text-[#5D7A4F] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C9886] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="login-password-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full pl-9 pr-10 py-2 text-sm rounded-xl border border-[#E5E0D5] focus:outline-hidden focus:ring-2 focus:ring-[#5D7A4F] transition-all bg-white text-[#2D3A26]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9886] hover:text-[#2D3A26] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    id="login-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2.5 rounded-full text-white font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      isFarmer
                        ? 'bg-[#5D7A4F] hover:bg-[#4B633F]'
                        : 'bg-[#8A9A5B] hover:bg-[#78884d]'
                    }`}
                  >
                    {isLoading ? 'Verifying Account...' : `Login to ${isFarmer ? 'Farmer Portal' : 'Consumer Portal'}`}
                  </button>

                  <div className="text-center text-xs text-[#5D6D56] pt-1">
                    Don't have an account yet?{' '}
                    <button
                      id="go-to-create-account-btn"
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="font-bold text-[#5D7A4F] hover:underline cursor-pointer"
                    >
                      Create Real Account
                    </button>
                  </div>

                  {/* Collapsible Demo Shortcuts for Developer / Testing convenience */}
                  <div className="pt-2 border-t border-[#E5E0D5]">
                    <details className="text-xs group">
                      <summary className="cursor-pointer text-[11px] font-semibold text-[#8C9886] hover:text-[#2D3A26] flex items-center justify-center gap-1.5 py-1 select-none">
                        <Sparkles className="w-3 h-3 text-[#8A9A5B]" />
                        <span>Optional: Demo accounts reference</span>
                      </summary>
                      <div className="mt-2 p-2.5 rounded-xl bg-[#EBF1E8] border border-[#D4CDBC] text-xs space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#2D3A26]">
                            {isFarmer ? 'Farmer Demo' : 'Consumer Demo'}:
                          </span>
                          <button
                            type="button"
                            onClick={() => autofillDemo(role)}
                            className="font-bold text-[#5D7A4F] hover:underline"
                          >
                            Autofill demo
                          </button>
                        </div>
                        <div className="bg-white/85 rounded-lg p-2 border border-[#D4CDBC]/60 text-[11px] text-[#5D6D56] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span>ID:</span>
                            <strong className="text-[#2D3A26] font-mono">{isFarmer ? 'rajesh_farmer' : 'tanmay123'}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Password:</span>
                            <strong className="text-[#2D3A26] font-mono">{isFarmer ? 'Farmer@123' : 'Consumer@123'}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleQuickDemoLogin(isFarmer ? 'rajesh_farmer' : 'tanmay123')}
                          className="w-full py-1.5 rounded-lg text-white font-semibold text-[11px] bg-[#5D7A4F] hover:bg-[#4B633F] transition-colors"
                        >
                          1-Click Demo Login
                        </button>
                      </div>
                    </details>
                  </div>
                </form>
              </div>
            )}

        {/* ================= MODE 2: FORGOT PASSWORD ================= */}
        {mode === 'forgot_password' && (
          <div className="bg-[#FAF8F5] rounded-2xl p-5 shadow-xs border border-[#E5E0D5]">
            <h3 className="text-sm font-bold text-[#2D3A26] font-serif mb-1">Reset Password</h3>
            <p className="text-xs text-[#5D6D56] mb-4">
              Enter your account username or email to receive a secure 6-digit verification code.
            </p>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Username or Email
                  </label>
                  <input
                    id="forgot-identifier-input"
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. rajesh_farmer or tanmay123"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <button
                  id="send-verification-btn"
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-semibold shadow-xs"
                >
                  Send Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="space-y-3">
                {generatedOtpHint && (
                  <div className="p-2 bg-[#F1EDE4] border border-[#E5E0D5] rounded-xl text-[#2D3A26] text-xs">
                    <span className="font-bold">🔑 Demo Verification Code: </span>
                    <span className="font-mono text-sm tracking-widest font-extrabold text-[#D97706]">
                      {generatedOtpHint}
                    </span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password-input"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password-input"
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <button
                  id="reset-password-submit-btn"
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] text-white text-xs font-semibold shadow-xs"
                >
                  Set New Password & Login
                </button>
              </form>
            )}

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-[#5D6D56] hover:text-[#2D3A26]"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* ================= MODE 3: REGISTRATION ================= */}
        {mode === 'register' && (
          <div className="bg-[#FAF8F5] rounded-2xl p-5 shadow-xs border border-[#E5E0D5]">
            {isFarmer ? (
              /* Farmer Multi-Step Registration */
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5E0D5] text-[11px] sm:text-xs">
                  <span
                    className={`font-semibold cursor-pointer ${
                      farmerStep === 1 ? 'text-[#5D7A4F]' : 'text-[#8C9886]'
                    }`}
                    onClick={() => setFarmerStep(1)}
                  >
                    1. Account
                  </span>
                  <span>→</span>
                  <span
                    className={`font-semibold cursor-pointer ${
                      farmerStep === 2 ? 'text-[#5D7A4F]' : 'text-[#8C9886]'
                    }`}
                    onClick={() => {
                      if (farmerStep > 2 || (fullName && username && email && regPassword)) {
                        setFarmerStep(2);
                      }
                    }}
                  >
                    2. Farm Details
                  </span>
                  <span>→</span>
                  <span
                    className={`font-semibold cursor-pointer ${
                      farmerStep === 3 ? 'text-[#5D7A4F]' : 'text-[#8C9886]'
                    }`}
                    onClick={() => {
                      if (farmerStep > 3 || (farmName && farmAddress)) {
                        setFarmerStep(3);
                      }
                    }}
                  >
                    3. Crops & GPS
                  </span>
                  <span>→</span>
                  <span
                    className={`font-semibold cursor-pointer ${
                      farmerStep === 4 ? 'text-[#5D7A4F]' : 'text-[#8C9886]'
                    }`}
                  >
                    4. Farm Photos *
                  </span>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {farmerStep === 1 && (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Ramesh Patil"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Mobile Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value)}
                            placeholder="+91 98220..."
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="farmer@organic.in"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                          Create Username (Case-Insensitive Unique)
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. ramesh_agro"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Create Password
                          </label>
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!fullName || !username || !email || !regPassword) {
                            setError('Please complete all account fields.');
                            return;
                          }
                          setError(null);
                          setFarmerStep(2);
                        }}
                        className="w-full mt-2 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F] transition-colors shadow-xs"
                      >
                        Next: Farm Details →
                      </button>
                    </div>
                  )}

                  {farmerStep === 2 && (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                          Farm Name
                        </label>
                        <input
                          type="text"
                          required
                          value={farmName}
                          onChange={(e) => setFarmName(e.target.value)}
                          placeholder="e.g. Vrindavan Agro & Fruit Orchards"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                          Farm Location / Address
                        </label>
                        <input
                          type="text"
                          required
                          value={farmAddress}
                          onChange={(e) => setFarmAddress(e.target.value)}
                          placeholder="e.g. Paud Valley, Mulshi, Pune"
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Farm Size
                          </label>
                          <div className="flex">
                            <input
                              type="number"
                              value={farmSize}
                              onChange={(e) => setFarmSize(e.target.value)}
                              className="w-16 px-2 py-1.5 text-xs rounded-l-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                            />
                            <select
                              value={farmSizeUnit}
                              onChange={(e) => setFarmSizeUnit(e.target.value as any)}
                              className="grow px-2 py-1.5 text-xs rounded-r-xl border border-l-0 border-[#E5E0D5] bg-[#F1EDE4] text-[#2D3A26] focus:outline-hidden"
                            >
                              <option value="acre">Acre</option>
                              <option value="hectare">Hectare</option>
                              <option value="bigha">Bigha</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Farming Style
                          </label>
                          <select
                            value={farmingStyle}
                            onChange={(e) => setFarmingStyle(e.target.value as FarmingStyle)}
                            className="w-full px-2 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-[#F1EDE4] text-[#2D3A26] focus:outline-hidden"
                          >
                            <option value="Organic">Organic Farming</option>
                            <option value="Conventional">Conventional Farming</option>
                            <option value="Mixed Farming">Mixed Farming</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Farm Type
                          </label>
                          <input
                            type="text"
                            value={farmType}
                            onChange={(e) => setFarmType(e.target.value)}
                            placeholder="e.g. Fruit Orchard, Agro-Tourism"
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2D3A26] mb-0.5">
                            Experience (Years)
                          </label>
                          <input
                            type="number"
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFarmerStep(1)}
                          className="w-1/2 py-2 rounded-xl bg-[#F1EDE4] text-[#2D3A26] text-xs font-semibold border border-[#E5E0D5]"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!farmName || !farmAddress) {
                              setError('Please provide farm name and location.');
                              return;
                            }
                            setError(null);
                            setFarmerStep(3);
                          }}
                          className="w-1/2 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F] transition-colors shadow-xs"
                        >
                          Next: Crops & GPS →
                        </button>
                      </div>
                    </div>
                  )}

                  {farmerStep === 3 && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                          Crops Grown (Fruits & Vegetables)
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-[#F1EDE4]/60 rounded-xl border border-[#E5E0D5] mb-2">
                          {PREDEFINED_CROPS.map((crop) => {
                            const isSelected = selectedCrops.includes(crop);
                            return (
                              <button
                                key={crop}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    handleRemoveCrop(crop);
                                  } else {
                                    setSelectedCrops([...selectedCrops, crop]);
                                  }
                                }}
                                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                                  isSelected
                                    ? 'bg-[#5D7A4F] text-white border-[#4B633F] shadow-2xs'
                                    : 'bg-white text-[#2D3A26] border-[#E5E0D5] hover:border-[#5D7A4F]'
                                }`}
                              >
                                {isSelected ? '✓ ' : '+ '}
                                {crop}
                              </button>
                            );
                          })}
                        </div>

                        {/* Add Other Crop */}
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customCropInput}
                            onChange={(e) => setCustomCropInput(e.target.value)}
                            placeholder="Add other crop (e.g. Dragonfruit)..."
                            className="grow px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomCrop();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomCrop}
                            className="px-3 py-1.5 rounded-xl bg-[#EBF1E8] text-[#5D7A4F] text-xs font-semibold hover:bg-[#dbe6d7] border border-[#D4CDBC]"
                          >
                            + Add
                          </button>
                        </div>

                        {/* Selected custom crops */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {selectedCrops.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 text-[11px] bg-[#EBF1E8] text-[#2D3A26] border border-[#D4CDBC] px-2 py-0.5 rounded-md"
                            >
                              {c}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-red-600"
                                onClick={() => handleRemoveCrop(c)}
                              />
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Coordinates */}
                      <div className="p-2.5 bg-[#F1EDE4]/70 border border-[#E5E0D5] rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2D3A26] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#5D7A4F]" /> Farm Coordinates (High Accuracy)
                          </span>
                          <button
                            id="farmer-reg-gps-btn"
                            type="button"
                            onClick={handleDetectCoordinates}
                            disabled={isDetectingFarmerGps}
                            className="text-[11px] font-semibold text-[#5D7A4F] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60"
                          >
                            <Compass className={`w-3 h-3 ${isDetectingFarmerGps ? 'animate-spin' : ''}`} />
                            {isDetectingFarmerGps ? 'Locking GPS...' : 'Auto-Detect via GPS'}
                          </button>
                        </div>
                        {farmerGpsAccuracy !== null && (
                          <div className="flex items-center gap-1 text-[10px] text-[#5D7A4F] font-medium bg-white px-2 py-0.5 rounded-md border border-[#E5E0D5]">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>GPS locked within ±{farmerGpsAccuracy}m accuracy</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-[#5D6D56]">Latitude</label>
                            <input
                              type="text"
                              value={farmLat}
                              onChange={(e) => setFarmLat(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-[#E5E0D5] bg-white text-[#2D3A26]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#5D6D56]">Longitude</label>
                            <input
                              type="text"
                              value={farmLng}
                              onChange={(e) => setFarmLng(e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded-lg border border-[#E5E0D5] bg-white text-[#2D3A26]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setFarmerStep(2)}
                          className="w-1/3 py-2 rounded-xl bg-[#F1EDE4] text-[#2D3A26] text-xs font-semibold border border-[#E5E0D5]"
                        >
                          ← Back
                        </button>
                        <button
                          id="farmer-reg-step3-next-btn"
                          type="button"
                          onClick={() => {
                            setError(null);
                            setFarmerStep(4);
                          }}
                          className="w-2/3 py-2 rounded-xl bg-[#5D7A4F] text-white text-xs font-semibold hover:bg-[#4B633F] transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Next: Upload Farm Photos</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {farmerStep === 4 && (
                    <div className="space-y-3.5">
                      <div className="p-3 bg-[#EBF1E8]/70 border border-[#D4CDBC] rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-[#5D7A4F] font-bold">
                          <Camera className="w-4 h-4" />
                          <span>Mandatory Verification: Farm Pictures</span>
                        </div>
                        <p className="text-[11px] text-[#5D6D56] leading-relaxed">
                          To maintain an authentic direct farm-to-table community, farmers must upload at least one real photo of their farm, fields, crops, or greenhouse from their device.
                        </p>
                      </div>

                      <FarmPhotoUpload
                        photos={farmPhotos}
                        onChange={(newPhotos) => {
                          setFarmPhotos(newPhotos);
                          if (newPhotos.length > 0) setError(null);
                        }}
                        maxPhotos={6}
                        isMandatory={true}
                      />

                      <div className="flex gap-2 pt-2 border-t border-[#E5E0D5]">
                        <button
                          type="button"
                          onClick={() => setFarmerStep(3)}
                          className="w-1/3 py-2 rounded-xl bg-[#F1EDE4] hover:bg-[#e4ded3] text-[#2D3A26] text-xs font-semibold border border-[#E5E0D5] transition-colors cursor-pointer"
                        >
                          ← Back
                        </button>
                        <button
                          id="register-farmer-submit-btn"
                          type="submit"
                          disabled={isLoading || farmPhotos.length === 0}
                          className="w-2/3 py-2 rounded-xl bg-[#5D7A4F] hover:bg-[#4B633F] disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isLoading ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Creating Farm...
                            </span>
                          ) : (
                            <span>Register Farm & Complete</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              /* Consumer Registration */
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tanmay More"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98765..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tanmay@example.com"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                    Create Username (Case-Insensitive)
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. tanmay123"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3A26] mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:ring-2 focus:ring-[#5D7A4F] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Delivery Address Details */}
                <div className="pt-2 border-t border-[#E5E0D5] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#2D3A26]">
                      Default Delivery Address
                    </label>
                    <button
                      id="consumer-reg-gps-btn"
                      type="button"
                      onClick={handleDetectConsumerCoordinates}
                      disabled={isDetectingConsumerGps}
                      className="text-[11px] font-semibold text-[#5D7A4F] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-60"
                    >
                      <Compass className={`w-3 h-3 ${isDetectingConsumerGps ? 'animate-spin' : ''}`} />
                      {isDetectingConsumerGps ? 'Detecting GPS...' : 'Autofill from GPS'}
                    </button>
                  </div>
                  {consumerGpsAccuracy !== null && (
                    <div className="flex items-center gap-1 text-[10px] text-[#5D7A4F] font-medium bg-[#EBF1E8] px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>GPS address locked within ±{consumerGpsAccuracy}m accuracy</span>
                    </div>
                  )}
                  <input
                    type="text"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="House/Flat No, Apartment, Street"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      placeholder="City (e.g. Pune)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={deliveryPincode}
                      onChange={(e) => setDeliveryPincode(e.target.value)}
                      placeholder="Pincode (e.g. 411045)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#E5E0D5] bg-white text-[#2D3A26] focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  id="register-consumer-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 rounded-xl bg-[#8A9A5B] hover:bg-[#78884d] text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  {isLoading ? 'Creating Account...' : 'Create Consumer Account'}
                </button>
              </form>
            )}

            <div className="mt-3 text-center text-xs text-[#5D6D56]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-[#5D7A4F] hover:underline"
              >
                Login
              </button>
            </div>
          </div>
        )}
        </>
      )}

        {/* Feature Badges Footer */}
        <div className="mt-6 pt-4 border-t border-[#E5E0D5] grid grid-cols-3 gap-2 text-center text-[#5D6D56]">
          {isFarmer ? (
            <>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <Trees className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Manage Farm</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <Sprout className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Manage Products</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Manage Orders</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <Sprout className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Fresh Produce</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <Trees className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Direct from Farmers</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#EBF1E8] flex items-center justify-center text-[#5D7A4F] mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium">Healthy & Safe</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
