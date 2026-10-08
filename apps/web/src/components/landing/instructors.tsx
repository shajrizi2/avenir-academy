import { getLandingMessages } from '@/i18n/server';
import { getInstructors } from '@/lib/landing-data';
import { LandingSection } from './landing-section';
import { PersonAvatar } from './person-avatar';

/** Renders nothing when there are no instructors yet. */
export async function Instructors() {
  const [{ t }, instructors] = await Promise.all([getLandingMessages(), getInstructors()]);
  if (instructors.length === 0) return null;

  return (
    <LandingSection
      id="instructors"
      tone="soft"
      eyebrow={t.instructors.eyebrow}
      title={t.instructors.title}
      intro={t.instructors.intro}
    >
      <ul className="flex flex-wrap justify-center gap-6">
        {instructors.map((person) => {
          const name = `${person.firstName} ${person.lastName}`;
          return (
            <li
              key={person.id}
              className="reveal border-line rounded-card bg-background flex w-full flex-col items-center border p-8 text-center sm:w-80"
            >
              <PersonAvatar name={name} src={person.avatarUrl} size={96} />
              <h3 className="text-ink mt-5 text-lg font-bold">{name}</h3>
              <p className="text-track-ai-ink text-sm font-bold">
                {person.title ?? t.instructors.fallbackRole}
              </p>
              {person.bio && <p className="text-ink-soft mt-3 leading-7">{person.bio}</p>}
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}
