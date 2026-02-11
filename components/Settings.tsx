
import React, { useState, useRef } from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    onBack: () => void;
    onReset: () => void;
}

type TabType = 'General' | 'Appearance' | 'Identity' | 'Notifications' | 'Advanced';

const Section: React.FC<React.PropsWithChildren<{ title: string, icon: string }>> = ({ title, icon, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors animate-in fade-in slide-in-from-right-4">
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-100 mb-6 flex items-center">
            <span className="mr-2 text-xl">{icon}</span> {title}
        </h3>
        {children}
    </div>
);

const SidebarItem: React.FC<{ label: TabType, icon: string, active: boolean, onClick: (label: TabType) => void }> = ({ label, icon, active, onClick }) => (
    <div 
        onClick={() => onClick(label)}
        className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all ${
        active 
            ? 'bg-brand-primary text-white shadow-lg' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
    }`}>
        <span className="text-lg">{icon}</span>
        <span className="font-bold text-sm">{label}</span>
    </div>
);

const Settings: React.FC<SettingsProps> = ({ settings, onSave, onBack, onReset }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
    const [activeTab, setActiveTab] = useState<TabType>('General');
    const [saveFeedback, setSaveFeedback] = useState(false);
    const importFileRef = useRef<HTMLInputElement>(null);

    const handleToggle = (key: keyof AppSettings) => {
        const next = { ...localSettings, [key]: !localSettings[key] };
        setLocalSettings(next);
        onSave(next);
    };

    const handleChange = (key: keyof AppSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleManualSave = () => {
        onSave(localSettings);
        setSaveFeedback(true);
        setTimeout(() => setSaveFeedback(false), 2000);
    };

    const exportData = () => {
        const data = localStorage.getItem('documents');
        if (!data) {
            alert("No data to export.");
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", `doc_hub_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportClick = () => {
        importFileRef.current?.click();
    };

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    if (confirm(`Found ${json.length} documents. This will overwrite your current local list. Continue?`)) {
                        localStorage.setItem('documents', JSON.stringify(json));
                        alert("Import successful! The app will now reload.");
                        window.location.reload();
                    }
                } else {
                    alert("Invalid backup file format.");
                }
            } catch (err) {
                alert("Failed to parse the backup file.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Settings</h2>
                    <p className="text-gray-500 dark:text-gray-400">Configure your office workspace and personal preferences.</p>
                </div>
                <button 
                    onClick={onBack}
                    className="flex items-center text-brand-primary dark:text-brand-secondary font-bold hover:underline"
                >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to Dashboard
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Sidebar */}
                <div className="space-y-2">
                    <SidebarItem active={activeTab === 'General'} label="General" icon="⚙️" onClick={setActiveTab} />
                    <SidebarItem active={activeTab === 'Appearance'} label="Appearance" icon="🎨" onClick={setActiveTab} />
                    <SidebarItem active={activeTab === 'Identity'} label="Identity" icon="🏢" onClick={setActiveTab} />
                    <SidebarItem active={activeTab === 'Notifications'} label="Notifications" icon="🔔" onClick={setActiveTab} />
                    <SidebarItem active={activeTab === 'Advanced'} label="Advanced" icon="🛡️" onClick={setActiveTab} />
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-8">
                    {activeTab === 'General' && (
                        <Section title="General Preferences" icon="⚙️">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Default Landing View</h4>
                                        <p className="text-xs text-gray-500">Page shown on app startup.</p>
                                    </div>
                                    <select 
                                        value={localSettings.defaultView}
                                        onChange={(e) => handleChange('defaultView', e.target.value)}
                                        className="p-2 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-700 dark:text-white outline-none"
                                    >
                                        <option value="dashboard">Dashboard</option>
                                        <option value="tracking">Tracking & Insights</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Auto AI Extraction</h4>
                                        <p className="text-xs text-gray-500">Analyze docs immediately upon upload.</p>
                                    </div>
                                    <button 
                                        onClick={() => handleToggle('autoExtract')}
                                        className={`w-14 h-8 rounded-full transition-all relative ${localSettings.autoExtract ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.autoExtract ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        </Section>
                    )}

                    {activeTab === 'Appearance' && (
                        <Section title="Interface & Appearance" icon="🎨">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Dark Mode</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Reduce eye strain in low-light environments.</p>
                                    </div>
                                    <button 
                                        onClick={() => handleToggle('darkMode')}
                                        className={`w-14 h-8 rounded-full transition-all relative ${localSettings.darkMode ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.darkMode ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Accent Color</h4>
                                    <div className="flex space-x-3">
                                        {['#005A9C', '#4A90E2', '#10B981', '#F43F5E', '#8B5CF6'].map(color => (
                                            <button 
                                                key={color}
                                                onClick={() => handleChange('accentColor', color)}
                                                style={{ backgroundColor: color }}
                                                className={`w-10 h-10 rounded-full border-4 transition-all ${localSettings.accentColor === color ? 'border-gray-400 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest italic">Global accent color applied across UI components.</p>
                                </div>
                            </div>
                        </Section>
                    )}

                    {activeTab === 'Identity' && (
                        <Section title="Office & User Identity" icon="🏢">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Office / Department Name</label>
                                    <input 
                                        type="text" 
                                        value={localSettings.officeName} 
                                        onChange={(e) => handleChange('officeName', e.target.value)}
                                        placeholder="e.g. Legal Affairs Registry"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                                        <input 
                                            type="text" 
                                            value={localSettings.userName} 
                                            onChange={(e) => handleChange('userName', e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Job Role</label>
                                        <input 
                                            type="text" 
                                            value={localSettings.userRole} 
                                            onChange={(e) => handleChange('userRole', e.target.value)}
                                            placeholder="Chief Registrar"
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Section>
                    )}

                    {activeTab === 'Notifications' && (
                        <Section title="Notification System" icon="🔔">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-100">Global Notifications</h4>
                                        <p className="text-xs text-gray-500">Enable browser-level alerts.</p>
                                    </div>
                                    <button 
                                        onClick={() => handleToggle('notificationsEnabled')}
                                        className={`w-14 h-8 rounded-full transition-all relative ${localSettings.notificationsEnabled ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${localSettings.notificationsEnabled ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>
                                <div className="p-4 bg-brand-light/20 dark:bg-brand-dark/10 rounded-xl border border-brand-primary/20">
                                    <h5 className="text-xs font-bold text-brand-primary dark:text-brand-secondary uppercase mb-2">Upcoming Features</h5>
                                    <div className="space-y-2 opacity-50">
                                        <div className="flex items-center space-x-2 text-xs dark:text-gray-300">
                                            <input type="checkbox" disabled /> <span>Email Daily Reports</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs dark:text-gray-300">
                                            <input type="checkbox" disabled /> <span>Urgent Pending Alerts</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Section>
                    )}

                    {activeTab === 'Advanced' && (
                        <Section title="Advanced & Safety" icon="🛡️">
                            <div className="space-y-6">
                                <input 
                                    type="file" 
                                    ref={importFileRef} 
                                    onChange={importData} 
                                    accept=".json" 
                                    className="hidden" 
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button 
                                        onClick={exportData}
                                        className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                    >
                                        <span className="text-2xl mb-2">📥</span>
                                        <span className="font-bold text-sm dark:text-white">Export Database</span>
                                        <span className="text-[10px] text-gray-500 mt-1">Download JSON Backup</span>
                                    </button>
                                    <button 
                                        onClick={handleImportClick}
                                        className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                                    >
                                        <span className="text-2xl mb-2">📤</span>
                                        <span className="font-bold text-sm dark:text-white">Import Backup</span>
                                        <span className="text-[10px] text-gray-500 mt-1">Restore from file</span>
                                    </button>
                                </div>

                                <div className="p-6 border-2 border-dashed border-red-100 dark:border-red-900/30 rounded-2xl bg-red-50/30 dark:bg-red-900/10">
                                    <h4 className="font-bold text-red-700 dark:text-red-400">Factory Reset</h4>
                                    <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-4">Wipe all locally stored documents, training models, and office identity.</p>
                                    <button 
                                        onClick={() => {
                                            if(confirm("DANGER: This will delete ALL documents and configurations permanently. Proceed?")) onReset();
                                        }}
                                        className="bg-white dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 py-2 px-6 rounded-lg font-bold hover:bg-red-600 dark:hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        Clear Local Database
                                    </button>
                                </div>
                            </div>
                        </Section>
                    )}

                    {/* Global Save Action */}
                    <div className="flex items-center justify-end space-x-4 pt-4 border-t dark:border-gray-700">
                        {saveFeedback && <span className="text-green-600 dark:text-green-400 font-bold animate-pulse text-sm">Preferences Saved!</span>}
                        <button 
                            onClick={handleManualSave}
                            className="bg-brand-primary hover:bg-brand-dark text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-all active:scale-95"
                        >
                            Save All Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
