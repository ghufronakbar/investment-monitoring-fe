'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { checkEmail, setPassword } from '@/services';
import {
    getApiErrorMessage,
    getRetryAfterSeconds,
    isApiError,
    isRateLimitError,
    isValidationError,
} from '@/lib/api';
import type { EmailStatus } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Schemas
const emailSchema = z.object({
    email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const setPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

// Flow steps
type Step = 'email' | 'password' | 'set-password';

export default function LoginPage() {
    const router = useRouter();
    const { login, isLoggingIn } = useAuth();

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

    const isRateLimited = rateLimitSeconds > 0;

    useEffect(() => {
        if (rateLimitSeconds <= 0) {
            return;
        }

        const timer = window.setInterval(() => {
            setRateLimitSeconds((current) => Math.max(0, current - 1));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [rateLimitSeconds]);

    // Email form
    const emailForm = useForm<EmailFormData>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: '' },
    });

    // Password form
    const passwordForm = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { password: '' },
    });

    // Set password form
    const setPasswordForm = useForm<SetPasswordFormData>({
        resolver: zodResolver(setPasswordSchema),
        defaultValues: { password: '', confirmPassword: '' },
    });

    const applyRateLimit = (error: unknown): boolean => {
        if (!isRateLimitError(error)) {
            return false;
        }

        const retryAfter = getRetryAfterSeconds(error) ?? 60;
        setRateLimitSeconds(retryAfter);
        toast.error(`Too many attempts. Try again in ${retryAfter} seconds.`);
        return true;
    };

    // Check email mutation
    const checkEmailMutation = useMutation({
        mutationFn: checkEmail,
        onSuccess: (data) => {
            const status: EmailStatus = data.status;

            if (status === 'NOT_FOUND') {
                toast.error('Email is not registered in the system');
                return;
            }

            if (status === 'SETUP_REQUIRED') {
                setStep('set-password');
                toast.info('Please set a password for your account');
                return;
            }

            if (status === 'LOGIN_READY') {
                setStep('password');
            }
        },
        onError: (error) => {
            if (applyRateLimit(error)) {
                return;
            }

            if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            } else {
                toast.error('An error occurred');
            }
        },
    });

    // Set password mutation
    const setPasswordMutation = useMutation({
        mutationFn: setPassword,
        onSuccess: () => {
            toast.success('Password set successfully. Please login.');
            setStep('password');
            setPasswordForm.reset();
        },
        onError: (error) => {
            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    setPasswordForm.setError(field as keyof SetPasswordFormData, { message });
                });
            } else if (isApiError(error)) {
                toast.error(getApiErrorMessage(error));
            }
        },
    });

    // Handle email submit
    const onEmailSubmit = (data: EmailFormData) => {
        if (isRateLimited) {
            return;
        }

        setEmail(data.email);
        checkEmailMutation.mutate(data.email);
    };

    // Handle password submit (login)
    const onPasswordSubmit = async (data: PasswordFormData) => {
        if (isRateLimited) {
            return;
        }

        try {
            await login({ email, password: data.password });
            toast.success('Login successful!');
            router.push('/dashboard');
        } catch (error) {
            if (applyRateLimit(error)) {
                return;
            }

            if (isValidationError(error)) {
                Object.entries(error.validationErrors).forEach(([field, message]) => {
                    passwordForm.setError(field as keyof PasswordFormData, { message });
                });
            } else if (isApiError(error)) {
                if (error.responseMessage === 'INVALID_CREDENTIALS') {
                    toast.error('Invalid password');
                } else {
                    toast.error(getApiErrorMessage(error));
                }
            }
        }
    };

    // Handle set password submit
    const onSetPasswordSubmit = (data: SetPasswordFormData) => {
        setPasswordMutation.mutate({
            email,
            password: data.password,
            confirmPassword: data.confirmPassword,
        });
    };

    // Go back to email step
    const goBack = () => {
        setStep('email');
        passwordForm.reset();
        setPasswordForm.reset();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">
                        JICA Investment System
                    </CardTitle>
                    <CardDescription>
                        {step === 'email' && 'Enter your email to continue'}
                        {step === 'password' && 'Enter your password'}
                        {step === 'set-password' && 'Set a password for your account'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isRateLimited && (
                        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
                            <AlertDescription>
                                Too many authentication attempts. Try again in {rateLimitSeconds} seconds.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Email Step */}
                    {step === 'email' && (
                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@organization.com"
                                    {...emailForm.register('email')}
                                    disabled={checkEmailMutation.isPending || isRateLimited}
                                />
                                {emailForm.formState.errors.email && (
                                    <p className="text-sm text-red-500">
                                        {emailForm.formState.errors.email.message}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={checkEmailMutation.isPending || isRateLimited}
                            >
                                {checkEmailMutation.isPending ? (
                                    <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Checking...
                                    </>
                                ) : (
                                    'Continue'
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Password Step (Login) */}
                    {step === 'password' && (
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={email} disabled className="bg-slate-50" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    {...passwordForm.register('password')}
                                    disabled={isLoggingIn || isRateLimited}
                                />
                                {passwordForm.formState.errors.password && (
                                    <p className="text-sm text-red-500">
                                        {passwordForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                                    Back
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isLoggingIn || isRateLimited}>
                                    {isLoggingIn ? (
                                        <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* Set Password Step */}
                    {step === 'set-password' && (
                        <form onSubmit={setPasswordForm.handleSubmit(onSetPasswordSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={email} disabled className="bg-slate-50" />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="At least 8 characters"
                                    {...setPasswordForm.register('password')}
                                    disabled={setPasswordMutation.isPending}
                                />
                                {setPasswordForm.formState.errors.password && (
                                    <p className="text-sm text-red-500">
                                        {setPasswordForm.formState.errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    placeholder="Repeat password"
                                    {...setPasswordForm.register('confirmPassword')}
                                    disabled={setPasswordMutation.isPending}
                                />
                                {setPasswordForm.formState.errors.confirmPassword && (
                                    <p className="text-sm text-red-500">
                                        {setPasswordForm.formState.errors.confirmPassword.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={setPasswordMutation.isPending}
                                >
                                    {setPasswordMutation.isPending ? (
                                        <>
                                            <Spinner className="mr-2 h-4 w-4" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Set Password'
                                    )}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
