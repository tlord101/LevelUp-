import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadImage, createPost } from '../services/supabaseService';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';

const CreatePostScreen: React.FC = () => {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageUrlFromShare, setImageUrlFromShare] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const shareData = location.state?.shareData;
        if (shareData) {
            setContent(shareData.content || '');
            if (shareData.imageUrl) {
                setImageUrlFromShare(shareData.imageUrl);
                setImagePreview(shareData.imageUrl);
            }
            // Clear the state so it's not reused on back/forward navigation
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("Image size cannot exceed 5MB.");
                hapticError();
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setImageUrlFromShare(null); // Clear shared URL if user uploads new image
            setError(null);
            hapticTap();
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrlFromShare(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        hapticTap();
    };

    const handlePost = async () => {
        if (!content.trim() && !imageFile && !imageUrlFromShare) {
            setError("Post cannot be empty.");
            hapticError();
            return;
        }
        if (!user || !userProfile?.display_name) {
            setError("You must be logged in to post.");
            hapticError();
            return;
        }

        setIsLoading(true);
        setError(null);
        hapticTap();

        try {
            let finalImageUrl: string | undefined = undefined;

            if (imageFile) {
                // If a user selected a new file, upload it. This takes precedence.
                finalImageUrl = await uploadImage(imageFile, user.id, 'posts');
            } else if (imageUrlFromShare) {
                // Otherwise, use the URL that came from the share action.
                finalImageUrl = imageUrlFromShare;
            }

            await createPost(user.id, userProfile.display_name, content, finalImageUrl);
            
            hapticSuccess();
            navigate('/community');
        } catch (err: any) {
            console.error("Failed to create post:", err);
            setError("Could not create post. Please try again.");
            hapticError();
        } finally {
            setIsLoading(false);
        }
    };

    const isPostButtonDisabled = isLoading || (!content.trim() && !imageFile && !imageUrlFromShare);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <header className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 p-4 border-b border-gray-200 flex items-center justify-between">
                <button onClick={() => { hapticTap(); navigate(-1); }} className="p-2 rounded-full hover:bg-gray-100">
                    <ArrowLeft size={24} className="text-gray-800" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Create Post</h1>
                <button 
                    onClick={handlePost}
                    disabled={isPostButtonDisabled}
                    className="bg-purple-600 text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-purple-700 transition disabled:bg-purple-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Post'}
                </button>
            </header>

            <main className="flex-grow p-4 space-y-4">
                <div className="flex items-start gap-3">
                    {userProfile?.display_name && (
                         <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {userProfile.display_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`What's on your mind, ${userProfile?.display_name || 'User'}?`}
                        className="w-full p-3 border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none text-lg bg-gray-50 rounded-lg"
                        rows={6}
                    />
                </div>

                {imagePreview && (
                    <div className="relative w-full max-w-sm mx-auto">
                        <img src={imagePreview} alt="Post preview" className="rounded-lg w-full h-auto object-cover" />
                        <button 
                            onClick={removeImage}
                            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                            aria-label="Remove image"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </main>
            
            <footer className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
                 <input 
                    type="file" 
                    accept="image/jpeg,image/png" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                />
                <button 
                    onClick={() => { hapticTap(); fileInputRef.current?.click(); }}
                    className="p-2 rounded-full hover:bg-gray-100 text-purple-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label="Add image"
                    disabled={!!imagePreview}
                >
                    <ImageIcon size={24} />
                </button>
            </footer>
        </div>
    );
};

export default CreatePostScreen;