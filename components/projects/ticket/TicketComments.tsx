'use client';

import { useState } from 'react';
import { Comment } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface TicketCommentsProps {
    comments: Comment[];
    onChange: (comments: Comment[]) => void;
}

export function TicketComments({ comments, onChange }: TicketCommentsProps) {
    const { user } = useAuth();
    const { users } = useUsers();
    const [newComment, setNewComment] = useState('');

    const handleAddComment = () => {
        if (!newComment.trim() || !user) return;

        const comment: Comment = {
            id: crypto.randomUUID(),
            content: newComment,
            userId: user.uid,
            createdAt: Timestamp.now(),
        };

        onChange([...comments, comment]);
        setNewComment('');
    };

    // Sort comments by date (newest first)
    const sortedComments = [...comments].sort((a, b) => {
        const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2">
                {comments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                        <p>No comments yet. Be the first to start the discussion!</p>
                    </div>
                )}

                {sortedComments.map((comment) => {
                    const commentUser = users.find(u => u.uid === comment.userId);
                    const date = comment.createdAt instanceof Timestamp ? comment.createdAt.toDate() : new Date(comment.createdAt);

                    return (
                        <div key={comment.id} className="flex gap-3 text-sm">
                            <Avatar className="h-8 w-8 mt-0.5 border">
                                <AvatarImage src={commentUser?.photoURL || undefined} />
                                <AvatarFallback>{commentUser?.displayName?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">{commentUser?.displayName || 'Unknown User'}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(date, { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-foreground bg-muted/30 p-3 rounded-md rounded-tl-none whitespace-pre-wrap">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t -mx-6 bg-muted/10 mt-auto">
                <div className="flex gap-2">
                    <Avatar className="h-8 w-8 hidden sm:block">
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback>{user?.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 gap-2 flex flex-col sm:flex-row">
                        <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="min-h-[80px] sm:min-h-[40px] resize-none"
                        />
                        <Button
                            size="icon"
                            disabled={!newComment.trim()}
                            onClick={handleAddComment}
                            className="shrink-0 self-end sm:self-auto"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
