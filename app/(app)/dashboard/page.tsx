'use client';

import { useAuthStore } from '@/lib/store/useAuthStore';

export default function DashboardPage() {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Dashboard Header */}
            <header className="mb-12">
                <div className="flex items-center gap-2 text-primary/70 mb-2">
                    <span className="text-sm font-bold tracking-wider">PROJECT OVERVIEW</span>
                    <span className="w-1 h-1 bg-primary/30 rounded-full"></span>
                    <span className="text-sm font-bold tracking-wider">WORKSPACE</span>
                </div>
                <h2 className="text-[3.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none mb-4">
                    Dashboard
                </h2>
                <div className="flex items-center gap-4">
                    <span className="text-on-surface-variant text-sm font-medium">
                        Welcome back, <span className="font-bold text-primary">{user?.displayName || 'User'}</span>
                    </span>
                </div>
            </header>

            {/* Bento Grid Dashboard Layout Placeholder */}
            <div className="grid grid-cols-12 gap-8 items-start">
                {/* Health Summary Card (Large) */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    <div className="bg-surface-container-lowest rounded-xl p-8 flex flex-col md:flex-row gap-8 border border-primary/5 shadow-sm">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                Status: <span className="text-primary">On Track</span>
                            </h3>
                            <p className="text-on-surface-variant mb-8 max-w-md">
                                Project velocity is steady. All high-priority milestones for this week are on track.
                            </p>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Total Progress</span>
                                        <span className="text-sm font-extrabold text-primary">74%</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-blue-400 w-[74%] rounded-full shadow-sm"></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-surface-container-low dark:bg-slate-800/50 p-4 rounded-lg border border-primary/5">
                                        <div className="text-[10px] uppercase font-bold text-primary mb-1">Completed</div>
                                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">124</div>
                                    </div>
                                    <div className="bg-surface-container-low dark:bg-slate-800/50 p-4 rounded-lg border border-primary/5">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">In Progress</div>
                                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">18</div>
                                    </div>
                                    <div className="bg-surface-container-low dark:bg-slate-800/50 p-4 rounded-lg border border-primary/5">
                                        <div className="text-[10px] uppercase font-bold text-rose-500 mb-1">Blocked</div>
                                        <div className="text-2xl font-extrabold text-rose-500">2</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Fake circular chart placeholder */}
                        <div className="w-full md:w-64 h-64 flex items-center justify-center bg-primary/5 rounded-xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center">
                                <svg className="w-40 h-40 transform -rotate-90 drop-shadow-sm">
                                    <circle className="text-primary/10" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"></circle>
                                    <circle className="text-primary" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="114" strokeLinecap="round" strokeWidth="12"></circle>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-extrabold text-primary">74%</span>
                                    <span className="text-[10px] font-bold text-primary/60 uppercase">Efficiency</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming Deadlines Placeholder */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
                            <button className="text-sm font-bold text-primary hover:underline">View All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-surface-container-lowest p-6 rounded-xl group hover:border-primary/20 border border-transparent transition-all cursor-pointer shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase">Urgent</span>
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">more_horiz</span>
                                </div>
                                <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors text-slate-900 dark:text-white">Audio Processing Overhaul</h4>
                                <p className="text-sm text-on-surface-variant mb-4">Core engine update.</p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-rose-500">event</span>
                                        <span className="text-xs font-bold text-rose-500">This Week</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-container-lowest p-6 rounded-xl group hover:border-primary/20 border border-transparent transition-all cursor-pointer shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Review</span>
                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary">more_horiz</span>
                                </div>
                                <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors text-slate-900 dark:text-white">Client Feedback</h4>
                                <p className="text-sm text-on-surface-variant mb-4">Review notes from the recent milestone.</p>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm text-primary">event</span>
                                        <span className="text-xs font-bold text-primary">Next Week</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Activity Feed (Right Column) Placeholder */}
                <aside className="col-span-12 lg:col-span-4 bg-surface-container-low/50 dark:bg-slate-800/30 rounded-xl p-8 sticky top-24 border border-primary/5">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Recent Activity</h3>
                    <div className="space-y-8 relative">
                        <div className="absolute left-4 top-2 bottom-2 w-px bg-primary/10"></div>
                        
                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10 shadow-md shadow-primary/20">
                                <span className="material-symbols-outlined text-xs text-white">add_task</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">System</span> added a new task to <span className="text-primary font-bold underline underline-offset-4 decoration-primary/30">Backend Sprint</span>
                                </p>
                                <span className="text-[11px] font-bold text-primary/60 mt-1">2 HOURS AGO</span>
                            </div>
                        </div>

                        <div className="relative pl-10">
                            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center z-10 shadow-md">
                                <span className="material-symbols-outlined text-xs text-white">check_circle</span>
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">Admin</span> completed <span className="italic text-on-surface-variant">Database Schema Migration</span>
                                </p>
                                <span className="text-[11px] font-bold text-primary/60 mt-1">5 HOURS AGO</span>
                            </div>
                        </div>
                    </div>
                    <button className="w-full mt-12 py-3 bg-white dark:bg-slate-900 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary/5 transition-colors shadow-sm">
                        View Full History
                    </button>
                </aside>
            </div>

            {/* Dashboard Bottom Quick Actions Placeholder */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-primary via-blue-700 to-blue-900 p-6 rounded-2xl text-white group cursor-pointer hover:scale-[1.03] transition-all shadow-xl shadow-primary/20">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                        <span className="material-symbols-outlined text-3xl text-white opacity-90">auto_awesome</span>
                    </div>
                    <h4 className="text-xl font-bold mb-2">AI Insights</h4>
                    <p className="text-sm text-white/80 leading-relaxed font-medium">Coming soon: Let Atrium analyze your project flow and suggest optimizations.</p>
                </div>
                <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border-2 border-primary/10 shadow-lg group cursor-pointer hover:scale-[1.03] transition-all hover:border-primary/30">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-3xl text-primary">share</span>
                    </div>
                    <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Export Report</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Coming soon: Generate professional reports customized for your stakeholders.</p>
                </div>
                <div className="bg-gradient-to-br from-white to-pink-50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-lg group cursor-pointer hover:scale-[1.03] transition-all hover:border-pink-200">
                    <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-900/30 flex items-center justify-center mb-4 group-hover:bg-pink-100 transition-colors">
                        <span className="material-symbols-outlined text-3xl text-pink-600">history_edu</span>
                    </div>
                    <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Resource Log</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Coming soon: Audit the time and budget allocated to recent sprints.</p>
                </div>
            </div>
        </div>
    );
}
