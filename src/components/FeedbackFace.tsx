export type FeedbackMood = "like" | "neutral" | "dislike";

interface Props {
  mood: FeedbackMood;
  className?: string;
}

export default function FeedbackFace({ mood, className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="20" strokeWidth="5" />
      {mood === "like" ? (
        <>
          <path d="m14 19 4-5 4 5m4 0 4-5 4 5" />
          <path d="M14 26c3 6 6 8.5 10 8.5s7-2.5 10-8.5c-5.5 2-14.5 2-20 0Z" fill="currentColor" stroke="none" />
        </>
      ) : mood === "neutral" ? (
        <>
          <circle cx="17" cy="17" r="1.5" fill="currentColor" />
          <circle cx="31" cy="17" r="1.5" fill="currentColor" />
          <path d="M17 31h14" />
        </>
      ) : (
        <>
          <path d="m14 14 7 7m0-7-7 7m12-7 7 7m0-7-7 7" />
          <path d="M14 35c3-6 6-8.5 10-8.5s7 2.5 10 8.5c-5.5-2-14.5-2-20 0Z" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
