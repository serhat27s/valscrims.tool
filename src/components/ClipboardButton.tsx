import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClipboardButtonProps {
    text: string;
    label?: string;
    variant?: 'default' | 'secondary' | 'outline';
    className?: string;
}

export const ClipboardButton = ({
    text,
    label = 'Copy',
    variant = 'secondary',
    className
}: ClipboardButtonProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Button
            onClick={handleCopy}
            variant={variant}
            className={cn('valorant-clip transition-all', className)}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4 mr-2" />
                    {label}
                </>
            )}
        </Button>
    );
};
