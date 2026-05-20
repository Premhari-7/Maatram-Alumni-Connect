import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { FiSave, FiUser, FiInfo, FiSliders, FiImage, FiBriefcase } from 'react-icons/fi';
import axios from 'axios';

const DEPARTMENTS_LIST = [
  "Computer Science & Engineering",
  "Information Technology",
  "Artificial Intelligence & Data Science",
  "Computer Technology",
  "Cyber Security & Digital Forensics",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Biotechnology",
  "Biomedical Engineering",
  "Automobile Engineering",
  "Mechatronics Engineering",
  "Food Technology",
  "Aerospace Engineering",
  "Computer Applications (BCA/MCA)",
  "Business Administration (BBA/MBA)",
  "Commerce (B.Com/M.Com)",
  "Nursing & Allied Health",
  "Pharmacy & Pharmaceutical Sciences",
  "Science & Humanities (Math/Physics/Chemistry)",
  "English & Applied Literature"
];

export const Settings = () => {
  const { user, token, isMockMode, refreshUser } = useAuth();
  const { showNotification } = useNotification();

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [avatar, setAvatar] = useState(user?.profile?.avatar || '');
  const [cover, setCover] = useState(user?.profile?.cover || '');
  const [department, setDepartment] = useState(user?.profile?.department || '');
  const [batch, setBatch] = useState(user?.profile?.batch || '');
  const [skills, setSkills] = useState(user?.profile?.skills?.join(', ') || '');
  const [company, setCompany] = useState(user?.profile?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.profile?.jobTitle || '');

  // Upload Progress Tracking
  const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
  const [coverProgress, setCoverProgress] = useState<number | null>(null);

  // Department Selection States
  const [isOtherDept, setIsOtherDept] = useState(() => {
    if (!user?.profile?.department) return false;
    return !DEPARTMENTS_LIST.includes(user.profile.department);
  });

  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (fileOrDataUrl: File | string, type: 'avatar' | 'cover') => {
    const uploadAsset = async (base64Data: string) => {
      const setProgress = type === 'avatar' ? setAvatarProgress : setCoverProgress;
      const setAsset = type === 'avatar' ? setAvatar : setCover;
      
      setProgress(0);
      
      try {
        if (isMockMode) {
          // Simulate local progress for development mock sessions
          for (let p = 10; p <= 100; p += 15) {
            setProgress(p);
            await new Promise(r => setTimeout(r, 60));
          }
          setAsset(base64Data);
          
          // Save mock file in local storage session
          const currentUserStr = localStorage.getItem('mock_db_current_user');
          const mockUsersStr = localStorage.getItem('mock_db_users');
          if (currentUserStr && mockUsersStr) {
            const curr = JSON.parse(currentUserStr);
            const allUsers = JSON.parse(mockUsersStr) as any[];
            
            const updatedUser = {
              ...curr,
              profile: {
                ...curr.profile,
                [type]: base64Data
              }
            };
            
            const updatedUsersList = allUsers.map(u => u._id === user?.id ? updatedUser : u);
            localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
            localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));
            
            refreshUser();
          }

          showNotification('Mock Media Saved', `Asset loaded directly as mock base64.`, 'info');
          setProgress(null);
          return;
        }

        const payload = type === 'avatar' 
          ? { avatar: base64Data } 
          : { cover: base64Data };

        const response = await axios.put(`${API_URL}/users/profile`, payload, {
          headers: { Authorization: `Bearer ${token}` },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || (progressEvent as any).bytesTotal || 0;
            if (total > 0) {
              const current = progressEvent.loaded;
              const percent = Math.round((current * 100) / total);
              setProgress(percent);
            }
          }
        });

        // Set secure URL returned from Cloudinary CDN endpoint
        if (type === 'avatar') {
          setAvatar(response.data.profile.avatar);
        } else {
          setCover(response.data.profile.cover);
        }
        
        refreshUser(); // globally refresh avatar in Headers/Sidebar/Feed
        showNotification('Asset Saved', `${type === 'avatar' ? 'Avatar' : 'Cover'} media uploaded to Cloudinary.`, 'success');
      } catch (err) {
        console.error(`Error uploading ${type}:`, err);
        showNotification('Upload Failed', 'There was an issue processing your media asset.', 'error');
      } finally {
        setProgress(null);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      uploadAsset(fileOrDataUrl);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(fileOrDataUrl);
      reader.onload = () => {
        uploadAsset(reader.result as string);
      };
    }
  };

  // Crop Modal States
  const [cropFileSrc, setCropFileSrc] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropOffsetX, setCropOffsetX] = useState<number>(0);
  const [cropOffsetY, setCropOffsetY] = useState<number>(0);

  const handleAvatarSelect = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setCropFileSrc(reader.result as string);
      setCropZoom(1);
      setCropOffsetX(0);
      setCropOffsetY(0);
      setIsCropModalOpen(true);
    };
  };

  const handleApplyCrop = () => {
    const img = new Image();
    img.src = cropFileSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 400;
      canvas.height = 400;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 400, 400);

        // Zoom details
        const sSize = size / cropZoom;
        
        // Calculate offsets
        const maxShiftX = (img.width - sSize) / 2;
        const maxShiftY = (img.height - sSize) / 2;
        
        const sX = (img.width - sSize) / 2 + (cropOffsetX / 100) * maxShiftX;
        const sY = (img.height - sSize) / 2 + (cropOffsetY / 100) * maxShiftY;
        
        ctx.drawImage(
          img,
          Math.max(0, Math.min(sX, img.width - sSize)),
          Math.max(0, Math.min(sY, img.height - sSize)),
          sSize,
          sSize,
          0,
          0,
          400,
          400
        );

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        handleFileUpload(croppedBase64, 'avatar');
        setIsCropModalOpen(false);
      }
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const skillsArray = skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const profileData = {
      name,
      profile: {
        bio,
        avatar,
        cover,
        department,
        batch,
        skills: skillsArray,
        company,
        jobTitle
      }
    };

    if (isMockMode && user) {
      const mockUsersStr = localStorage.getItem('mock_db_users');
      const currentUserStr = localStorage.getItem('mock_db_current_user');
      
      if (mockUsersStr && currentUserStr) {
        const allUsers = JSON.parse(mockUsersStr) as any[];
        const curr = JSON.parse(currentUserStr);

        const updatedUser = {
          ...curr,
          name,
          profile: {
            ...curr.profile,
            ...profileData.profile
          }
        };

        const updatedUsersList = allUsers.map(u => u._id === user.id ? updatedUser : u);

        localStorage.setItem('mock_db_current_user', JSON.stringify(updatedUser));
        localStorage.setItem('mock_db_users', JSON.stringify(updatedUsersList));

        refreshUser();
        showNotification('Profile Saved', 'Your details have been saved locally.', 'success');
      }
      setSaving(false);
    } else {
      try {
        await axios.put(`${API_URL}/users/profile`, profileData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Profile Saved', 'Your profile details have been successfully synchronized.', 'success');
        refreshUser();
      } catch (err) {
        console.error('Update profile error:', err);
        showNotification('Save Failed', 'Server error updating profile details.', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div style={{ fontFamily: 'var(--font-body)', maxWidth: '800px' }}>
      
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-title)' }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-gray)', marginTop: '4px' }}>
          Customize your public profile card, upload high-definition banner images, and adjust professional catalog information.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Core Profile Details */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiUser /> Profile Basics
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Department Dropdown with 'Others' custom input */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Department</label>
              <select
                required={!isOtherDept}
                value={isOtherDept ? 'Others' : department}
                onChange={(e) => {
                  if (e.target.value === 'Others') {
                    setIsOtherDept(true);
                    setDepartment('');
                  } else {
                    setIsOtherDept(false);
                    setDepartment(e.target.value);
                  }
                }}
                className="form-input"
              >
                <option value="" disabled>Select your department</option>
                {DEPARTMENTS_LIST.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                <option value="Others">Others (Type your own)</option>
              </select>

              {isOtherDept && (
                <div style={{ marginTop: '12px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Enter your custom department..."
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="form-input"
                  />
                </div>
              )}
            </div>

            <div className="form-group settings-span" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Biography / Summary</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Share a brief overview of your academic or professional journey..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(10,10,10,0.7)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '14px',
                  fontFamily: 'var(--font-body)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Drag and Drop Profile Image Upload Blocks */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiImage /> Media Assets
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
            
            {/* Avatar upload */}
            <div className="form-group">
              <label className="form-label">Profile Avatar</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleAvatarSelect(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  height: '140px',
                  borderRadius: '16px',
                  border: '2px dashed rgba(255, 215, 0, 0.25)',
                  background: 'rgba(10,10,10,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-yellow-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.25)'}
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                <input 
                  type="file" 
                  id="avatar-input" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleAvatarSelect(e.target.files[0]);
                    }
                  }}
                />
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt="Avatar Preview" 
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      objectPosition: 'top center',
                      border: '2px solid var(--color-yellow-primary)',
                      boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
                      marginBottom: '8px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    color: 'var(--color-text-muted)'
                  }}>
                    <FiUser size={30} />
                  </div>
                )}
                
                <span style={{ fontSize: '12px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
                  Drag & Drop or Click to Upload
                </span>
                
                {avatarProgress !== null && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    zIndex: 10
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-yellow-primary)', fontWeight: 700, marginBottom: '6px' }}>
                      Uploading {avatarProgress}%
                    </span>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${avatarProgress}%`, height: '100%', background: 'var(--color-yellow-primary)', transition: 'width 0.1s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cover upload */}
            <div className="form-group">
              <label className="form-label">Cover Banner</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0], 'cover');
                  }
                }}
                style={{
                  height: '140px',
                  borderRadius: '16px',
                  border: '2px dashed rgba(255, 215, 0, 0.25)',
                  background: 'rgba(10,10,10,0.6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-yellow-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.25)'}
                onClick={() => document.getElementById('cover-input')?.click()}
              >
                <input 
                  type="file" 
                  id="cover-input" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0], 'cover');
                    }
                  }}
                />
                {cover ? (
                  <div style={{
                    width: '120px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    marginBottom: '8px'
                  }}>
                    <img 
                      src={cover} 
                      alt="Cover Preview" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '120px',
                    height: '60px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    color: 'var(--color-text-muted)'
                  }}>
                    <FiImage size={24} />
                  </div>
                )}
                
                <span style={{ fontSize: '12px', color: 'var(--color-text-gray)', fontWeight: 500 }}>
                  Drag & Drop or Click to Upload
                </span>
                
                {coverProgress !== null && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    zIndex: 10
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--color-yellow-primary)', fontWeight: 700, marginBottom: '6px' }}>
                      Uploading {coverProgress}%
                    </span>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${coverProgress}%`, height: '100%', background: 'var(--color-yellow-primary)', transition: 'width 0.1s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Academic & Professional details */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'rgba(255, 215, 0, 0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-yellow-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiBriefcase /> Academic & Careers
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
            <div className="form-group">
              <label className="form-label">Batch Years</label>
              <input
                type="text"
                placeholder="e.g. 2016-2020"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Skills (Comma-separated)</label>
              <input
                type="text"
                placeholder="React, Node.js, Python, Figma"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="form-input"
              />
            </div>

            {user?.role === 'alumni' && (
              <>
                <div className="form-group">
                  <label className="form-label">Current Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action button */}
        <div>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{
              padding: '12px 30px',
              fontSize: '15px',
              gap: '8px'
            }}
          >
            <FiSave /> {saving ? 'Saving changes...' : 'Save Profile Details'}
          </button>
        </div>

      </form>

      {isCropModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            borderColor: 'rgba(255,215,0,0.15)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-title)', margin: 0 }}>
              Adjust Profile Avatar
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-gray)', margin: 0 }}>
              Drag the sliders below to center your face and adjust the framing before uploading.
            </p>

            {/* Circular Preview Container */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 0'
            }}>
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '3px solid var(--color-yellow-primary)',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.25)',
                background: '#000000'
              }}>
                <img
                  src={cropFileSrc}
                  alt="Crop Target"
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${cropZoom}) translate(${cropOffsetX}%, ${cropOffsetY}%)`,
                    transition: 'transform 0.05s ease-out'
                  }}
                />
              </div>
            </div>

            {/* Zoom Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Zoom Level</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropZoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Horizontal Offset Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Horizontal Offset</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropOffsetX > 0 ? `+${cropOffsetX}` : cropOffsetX}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={cropOffsetX}
                onChange={(e) => setCropOffsetX(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Vertical Offset Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500, color: '#e0e0e0' }}>
                <span>Vertical Offset</span>
                <span style={{ color: 'var(--color-yellow-primary)' }}>{cropOffsetY > 0 ? `+${cropOffsetY}` : cropOffsetY}%</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={cropOffsetY}
                onChange={(e) => setCropOffsetY(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-yellow-primary)',
                  background: 'rgba(255,255,255,0.1)',
                  height: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border-glass)',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                style={{
                  flex: 1,
                  background: 'var(--color-yellow-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#000000',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .settings-grid {
            grid-template-columns: 1fr !important;
          }
          .settings-span {
            grid-column: span 1 !important;
          }
        }
      `}</style>

    </div>
  );
};
export default Settings;
