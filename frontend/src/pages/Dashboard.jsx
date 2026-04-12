import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { feedAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [friendPosts, setFriendPosts] = useState([]);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [postOffset, setPostOffset] = useState(0);
  const [jobOffset, setJobOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreJobs, setHasMoreJobs] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [error, setError] = useState('');
  const feedAnchorRef = useRef(null);

  const totalFeedItems = useMemo(
    () => (friendPosts?.length || 0) + (companyJobs?.length || 0),
    [friendPosts, companyJobs]
  );

  const replacePostInState = (updatedPost) => {
    setFriendPosts((previous) => previous.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  };

  const removePostFromState = (postId) => {
    setFriendPosts((previous) => previous.filter((post) => post.id !== postId));
  };

  const loadFeed = async ({ append = false } = {}) => {
    try {
      setError('');
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingFeed(true);
      }

      const params = append
        ? { post_offset: postOffset, job_offset: jobOffset, limit: 10 }
        : { post_offset: 0, job_offset: 0, limit: 10 };
      const response = await feedAPI.getHomeFeed(params);
      const data = response.data || {
        friend_posts: [],
        company_jobs: [],
        next_post_offset: 0,
        next_job_offset: 0,
        has_more_posts: false,
        has_more_jobs: false,
      };

      if (append) {
        setFriendPosts((previous) => [...previous, ...(data.friend_posts || [])]);
        setCompanyJobs((previous) => [...previous, ...(data.company_jobs || [])]);
      } else {
        setFriendPosts(data.friend_posts || []);
        setCompanyJobs(data.company_jobs || []);
      }

      setPostOffset(data.next_post_offset || 0);
      setJobOffset(data.next_job_offset || 0);
      setHasMorePosts(Boolean(data.has_more_posts));
      setHasMoreJobs(Boolean(data.has_more_jobs));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load home feed');
    } finally {
      setLoadingFeed(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  useEffect(() => {
    const anchor = feedAnchorRef.current;
    if (!anchor) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) {
          return;
        }
        if (loadingFeed || loadingMore) {
          return;
        }
        if (!hasMorePosts && !hasMoreJobs) {
          return;
        }
        loadFeed({ append: true });
      },
      { rootMargin: '200px' }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [loadingFeed, loadingMore, hasMorePosts, hasMoreJobs, postOffset, jobOffset]);

  const handleCreatePost = async (event) => {
    event.preventDefault();
    if (!postContent.trim() && !postImage) {
      setError('Please add text or an image to create a post.');
      return;
    }

    try {
      setError('');
      setPosting(true);
      await feedAPI.createPost(postContent.trim(), postImage);
      setPostContent('');
      setPostImage(null);
      await loadFeed({ append: false });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      setError('');
      const response = await feedAPI.togglePostLike(postId);
      replacePostInState(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update like');
    }
  };

  const handleAddComment = async (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) {
      return;
    }

    try {
      setError('');
      const response = await feedAPI.addPostComment(postId, content);
      replacePostInState(response.data);
      setCommentDrafts((previous) => ({ ...previous, [postId]: '' }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to add comment');
    }
  };

  const startEditingPost = (post) => {
    setEditingPostId(post.id);
    setEditContent(post.content || '');
  };

  const cancelEditingPost = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  const savePostEdit = async (postId) => {
    const content = editContent.trim();
    if (!content) {
      setError('Post content cannot be empty.');
      return;
    }

    try {
      setError('');
      const response = await feedAPI.updatePost(postId, content);
      replacePostInState(response.data);
      cancelEditingPost();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update post');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      setError('');
      await feedAPI.deletePost(postId);
      removePostFromState(postId);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete post');
    }
  };

  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="li-card p-4 sm:p-6">
        <p className="text-sm text-gray-500">Welcome back</p>
        <h1 className="li-title mt-1">{user?.full_name}</h1>
        <p className="li-subtitle mt-2 sm:mt-3">Keep building your professional profile and opportunities.</p>
      </div>

      {error && <div className="li-card border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form className="li-card p-3 sm:p-4 space-y-3" onSubmit={handleCreatePost}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0a66c2] text-white flex items-center justify-center font-semibold shadow-sm shrink-0">
            {(user?.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <textarea
            className="li-input min-h-[88px]"
            placeholder="Start a post about your skills, goals, or work update..."
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={(event) => setPostImage(event.target.files?.[0] || null)}
            className="text-sm text-gray-600"
          />
          {postImage && <span className="text-xs text-gray-500">Selected: {postImage.name}</span>}
          <button type="submit" className="li-btn-primary sm:ml-auto" disabled={posting}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      <div className="li-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Home feed</h2>
          <p className="text-xs text-gray-500">{totalFeedItems} items</p>
        </div>

        {loadingFeed ? (
          <p className="text-sm text-gray-500">Loading feed...</p>
        ) : totalFeedItems === 0 ? (
          <p className="text-sm text-gray-500">No feed items yet. Add friends, post updates, or check jobs.</p>
        ) : (
          <div className="space-y-4">
            {friendPosts?.map((post) => (
              <article key={`post-${post.id}`} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{post.author_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                </div>
                {editingPostId === post.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="li-input min-h-[88px]"
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <button type="button" className="li-btn-primary !py-1 !px-3" onClick={() => savePostEdit(post.id)}>
                        Save
                      </button>
                      <button type="button" className="li-btn-secondary !py-1 !px-3" onClick={cancelEditingPost}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
                )}
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post attachment"
                    className="mt-3 w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50"
                  />
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                  <button type="button" className="hover:text-[#0a66c2]" onClick={() => handleToggleLike(post.id)}>
                    {post.is_liked_by_me ? 'Unlike' : 'Like'} ({post.like_count || 0})
                  </button>
                  <span>Comments ({post.comment_count || 0})</span>
                  {post.author_id === user?.id && editingPostId !== post.id && (
                    <>
                      <button type="button" className="hover:text-[#0a66c2]" onClick={() => startEditingPost(post)}>
                        Edit
                      </button>
                      <button type="button" className="text-red-600 hover:underline" onClick={() => handleDeletePost(post.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {(post.comments || []).map((comment) => (
                    <div key={comment.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800">{comment.user_name}</p>
                        <p className="text-[11px] text-gray-500">{formatDate(comment.created_at)}</p>
                      </div>
                      <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      className="li-input !py-2"
                      placeholder="Write a comment..."
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) =>
                        setCommentDrafts((previous) => ({
                          ...previous,
                          [post.id]: event.target.value,
                        }))
                      }
                    />
                    <button type="button" className="li-btn-secondary !py-2 !px-3" onClick={() => handleAddComment(post.id)}>
                      Comment
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {companyJobs?.map((job) => (
              <article key={`job-${job.id}`} className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{job.company_name}</p>
                  <p className="text-xs text-gray-600">{formatDate(job.created_at)}</p>
                </div>
                <h3 className="mt-1 text-base font-semibold text-[#0a66c2]">{job.title}</h3>
                <p className="mt-2 text-sm text-gray-700">{job.description}</p>
                <p className="mt-2 text-xs text-gray-600">
                  {job.location || 'Location not specified'} | {job.work_mode} | {job.employment_type}
                </p>
                <Link to="/jobs" className="mt-3 inline-block text-sm font-medium text-[#0a66c2] hover:underline">
                  View and apply
                </Link>
              </article>
            ))}

            {(hasMorePosts || hasMoreJobs) && (
              <div ref={feedAnchorRef} className="py-2 text-center text-xs text-gray-500">
                {loadingMore ? 'Loading more feed items...' : 'Scroll to load more'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="li-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/profile"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Edit Profile</h3>
            <p className="text-sm text-gray-600 mt-1">Keep your headline, location, and bio updated.</p>
          </Link>

          <Link
            to="/resume"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Manage Resume</h3>
            <p className="text-sm text-gray-600 mt-1">Upload encrypted CVs and control visibility.</p>
          </Link>

          <Link
            to="/jobs"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Jobs & Applications</h3>
            <p className="text-sm text-gray-600 mt-1">Discover roles and track application pipeline.</p>
          </Link>

          <Link
            to="/companies"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Companies</h3>
            <p className="text-sm text-gray-600 mt-1">View all companies and manage your organization profiles.</p>
          </Link>

          <Link
            to="/messages"
            className="border border-gray-200 rounded-xl p-3 sm:p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Secure Messaging</h3>
            <p className="text-sm text-gray-600 mt-1">Continue candidate-recruiter conversations.</p>
          </Link>
        </div>
      </div>

      <div className="li-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profile completion snapshot</h2>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-600">Verification status</span>
          <span className="font-semibold text-green-700">{user?.is_verified ? 'Verified' : 'Pending'}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">Role</span>
          <span className="font-semibold capitalize">{user?.role}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
