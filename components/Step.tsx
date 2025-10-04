import React from 'react';
import { CheckIcon } from './icons/CheckIcon';

type StepStatus = 'locked' | 'active' | 'completed';

interface StepProps {
    stepNumber: number;
    title: string;
    status: StepStatus;
    children: React.ReactNode;
}

const statusConfig = {
    locked: {
        iconBg: 'bg-gray-700 border-gray-600',
        titleColor: 'text-gray-500',
        contentVisible: false,
    },
    active: {
        iconBg: 'bg-purple-600 border-purple-500 ring-4 ring-purple-500/30',
        titleColor: 'text-white',
        contentVisible: true,
    },
    completed: {
        iconBg: 'bg-green-600 border-green-500',
        titleColor: 'text-gray-300',
        contentVisible: true,
    }
};

export const Step: React.FC<StepProps> = ({ stepNumber, title, status, children }) => {
    const config = statusConfig[status];

    return (
        <section className={`transition-all duration-500 ${status === 'locked' ? 'opacity-50' : ''}`}>
            <div className="flex items-center space-x-4 space-x-reverse">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${config.iconBg}`}>
                    {status === 'completed' ? <CheckIcon /> : <span className="font-bold text-lg text-white">{stepNumber}</span>}
                </div>
                <h2 className={`text-2xl font-bold transition-colors duration-300 ${config.titleColor}`}>{title}</h2>
            </div>
            
            {config.contentVisible && (
                <div className="pt-6 pb-8 ml-5 rtl:mr-5 rtl:ml-0 border-r-2 rtl:border-r-0 rtl:border-l-2 border-gray-700 pl-9 rtl:pr-9 rtl:pl-0">
                    {children}
                </div>
            )}
        </section>
    );
};