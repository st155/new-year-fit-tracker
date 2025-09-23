-- Add foreign key constraints for activity_feed and activity_comments
ALTER TABLE public.activity_feed 
ADD CONSTRAINT activity_feed_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.activity_comments 
ADD CONSTRAINT activity_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;