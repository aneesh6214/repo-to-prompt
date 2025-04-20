import React from 'react';

interface InputFieldProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}

const InputField: React.FC<InputFieldProps> = ({ value, onChange, placeholder }) => {
    return (
        <div className="group relative bg-neutral-800 h-16 w-64 border text-left 
            p-3 text-gray-50 text-base font-bold rounded-lg overflow-hidden 
            before:absolute before:w-12 before:h-12 before:content[''] before:right-1 before:top-1 before:z-10 before:bg-violet-500 before:rounded-full 
            before:blur-lg after:absolute after:z-10 after:w-20 after:h-20 after:content[''] after:bg-rose-300 after:right-8 
            after:top-3 after:rounded-full after:blur-lg 
            flex items-center justify-center">
            <input 
                type="text" 
                className="bg-neutral-800 border-none focus:outline-none flex-1" 
                placeholder={placeholder} 
                value={value} 
                onChange={onChange} 
            />
        </div>
    );
}

export default InputField;

