
import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';

interface HeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    setActiveList: (list: 'incoming' | 'outgoing') => void;
    setView: React.Dispatch<React.SetStateAction<ViewState>>;
    officeName?: string;
    userName?: string;
}

const Header: React.FC<HeaderProps> = ({ searchTerm, setSearchTerm, setActiveList, setView, officeName = 'In-Out Document Tracker', userName = 'Admin' }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


  return (
    <header className="bg-brand-primary text-white shadow-md dark:bg-brand-dark transition-colors duration-300 print:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
             {/* Hamburger Menu */}
            <div className="relative" ref={menuRef}>
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md hover:bg-brand-dark dark:hover:bg-brand-primary focus:outline-none focus:bg-brand-dark transition-colors">
                    <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
                {isMenuOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-1">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workflows</div>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'add-incoming-method' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Incoming
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'add-method' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Outgoing
                        </a>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Intelligence</div>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'tracking' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-brand-primary dark:text-brand-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Tracking & Insights
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'print' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Print & Export Logs
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'train-ai' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Train AI Models
                        </a>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'settings' }); setIsMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center font-bold">
                            <svg className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Settings
                        </a>
                    </div>
                )}
            </div>

            <div className="flex items-center ml-2 sm:ml-4 cursor-pointer" onClick={() => setView({ name: 'dashboard' })}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex flex-col">
                    <h1 className="text-sm sm:text-lg font-bold leading-tight hidden sm:block">{officeName}</h1>
                    <p className="text-[10px] uppercase tracking-widest text-brand-light font-medium hidden sm:block">Digital Document Hub</p>
                </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Bar */}
            <div className="relative">
                <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search docs..."
                    className="bg-brand-dark dark:bg-gray-700 text-white rounded-full py-1.5 sm:py-2 pl-10 pr-4 w-28 sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-secondary transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                </div>
            </div>

            {/* Profile Icon */}
            <div className="relative" ref={profileRef}>
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="h-9 w-9 sm:h-10 sm:w-10 bg-brand-dark dark:bg-gray-700 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-primary focus:ring-white overflow-hidden border border-brand-light/20">
                    <span className="font-bold text-xs sm:text-sm">{userName.charAt(0).toUpperCase()}</span>
                </button>
                {isProfileOpen && (
                     <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-1">
                        <div className="px-4 py-2 border-b dark:border-gray-700">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{userName}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{officeName}</p>
                        </div>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'settings' }); setIsProfileOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Account Settings</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setView({ name: 'settings' }); setIsProfileOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center">
                            Dark Mode 
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">Auto</span>
                        </a>
                        <div className="border-t border-gray-100 dark:border-gray-700"></div>
                        <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Sign Out</a>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
