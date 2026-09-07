import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export function useAudioRecorder() {
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioURL(url);
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            mediaRecorderRef.current.start();
            setRecording(true);
            toast.success('Recording started');
        } catch (error) {
            console.error('Recording error:', error);
            toast.error('Failed to start recording. Please check microphone permissions.');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            toast.success('Recording stopped');
        }
    }, [recording]);

    const resetRecording = useCallback(() => {
        setAudioBlob(null);
        setAudioURL(url => { if (url) URL.revokeObjectURL(url); return ''; });
    }, []);

    // Guard against a mic left open if the component unmounts mid-recording
    useEffect(() => () => {
        streamRef.current?.getTracks().forEach(track => track.stop());
    }, []);

    return { recording, audioBlob, audioURL, startRecording, stopRecording, resetRecording };
}
