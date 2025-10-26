import React, { useContext, useState, useEffect } from 'react';
import UserContext from '../context/UserContext';

const SectionList = ({ title, items = [], onAdd, onRemove, renderItem }) => {
  const [input, setInput] = useState('');

  return (
    <section className="bg-white shadow rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Add ${title.slice(0, -1)}`}
            className="border px-2 py-1 rounded text-sm"
          />
          <button
            onClick={() => {
              if (!input) return;
              onAdd(input.trim());
              setInput('');
            }}
            className="bg-blue-800 text-white px-3 py-1 rounded text-sm"
          >Add</button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No items yet</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex justify-between items-start gap-4">
              <div className="text-sm text-gray-700">{renderItem ? renderItem(it) : it}</div>
              <button
                onClick={() => onRemove(idx)}
                className="text-red-600 text-sm hover:underline"
              >Remove</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const StudentAboutMe = () => {
  const { user, setUser } = useContext(UserContext);
  const [local, setLocal] = useState(() => (
    JSON.parse(localStorage.getItem('user')) || {}
  ));

  useEffect(() => {
    setLocal(JSON.parse(localStorage.getItem('user')) || {});
  }, [user]);

  // ensure aboutMe shape
  const about = local.aboutMe || {
    headline: '',
    aboutText: '',
    education: [],
    experience: [],
    projects: [],
    skills: [],
    certifications: [],
    achievements: [],
    links: [],
    activity: [],
  };

  const save = (next) => {
    const merged = { ...(JSON.parse(localStorage.getItem('user')) || {}), ...next };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
    setLocal(merged);
  };

  const updateAbout = (patch) => {
    const next = { ...about, ...patch };
    save({ aboutMe: next });
  };

  const addToList = (key, value) => {
    const arr = Array.isArray(about[key]) ? [...about[key], value] : [value];
    updateAbout({ [key]: arr });
  };

  const removeFromList = (key, index) => {
    const arr = Array.isArray(about[key]) ? about[key].filter((_, i) => i !== index) : [];
    updateAbout({ [key]: arr });
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
  <h1 className="text-2xl font-bold text-[#132E6B] mb-4">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 bg-white shadow rounded-lg p-4 flex flex-col items-center">
            <img
              src={local.photo || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}
              alt="avatar"
              className="w-32 h-32 rounded-full object-cover border mb-3"
            />
            <h2 className="font-semibold text-lg">{local.name || 'Student'}</h2>
            <p className="text-sm text-gray-600">{about.headline || '—'}</p>
            <div className="mt-3 w-full">
              <label className="block text-xs text-gray-500">Headline</label>
              <input
                value={about.headline}
                onChange={(e) => updateAbout({ headline: e.target.value })}
                className="w-full mt-1 border px-2 py-1 rounded text-sm"
                placeholder="Short headline (e.g., CS Undergrad, ML enthusiast)"
              />
            </div>
          </div>

          <div className="col-span-2 bg-white shadow rounded-lg p-4">
            <h3 className="font-semibold mb-2">Profile</h3>
            <textarea
              value={about.aboutText}
              onChange={(e) => updateAbout({ aboutText: e.target.value })}
              placeholder="Write a short bio about yourself"
              className="w-full border rounded p-2 text-sm h-28"
            />
          </div>
        </div>

        {/* Sections */}
        <SectionList
          title="Education"
          items={about.education}
          onAdd={(val) => addToList('education', val)}
          onRemove={(idx) => removeFromList('education', idx)}
          renderItem={(it) => <div>{it}</div>}
        />

        <SectionList
          title="Experience"
          items={about.experience}
          onAdd={(val) => addToList('experience', val)}
          onRemove={(idx) => removeFromList('experience', idx)}
        />

        <SectionList
          title="Projects"
          items={about.projects}
          onAdd={(val) => addToList('projects', val)}
          onRemove={(idx) => removeFromList('projects', idx)}
        />

        <SectionList
          title="Skills"
          items={about.skills}
          onAdd={(val) => addToList('skills', val)}
          onRemove={(idx) => removeFromList('skills', idx)}
        />

        <SectionList
          title="Certifications"
          items={about.certifications}
          onAdd={(val) => addToList('certifications', val)}
          onRemove={(idx) => removeFromList('certifications', idx)}
        />

        <SectionList
          title="Achievements"
          items={about.achievements}
          onAdd={(val) => addToList('achievements', val)}
          onRemove={(idx) => removeFromList('achievements', idx)}
        />

        <SectionList
          title="Links"
          items={about.links}
          onAdd={(val) => addToList('links', val)}
          onRemove={(idx) => removeFromList('links', idx)}
        />

        <SectionList
          title="Activity"
          items={about.activity}
          onAdd={(val) => addToList('activity', val)}
          onRemove={(idx) => removeFromList('activity', idx)}
        />

        <div className="text-right mt-4">
          <button
            onClick={() => {
              // small feedback: push a timestamped activity
              addToList('activity', `Updated profile at ${new Date().toLocaleString()}`);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >Save / Record Activity</button>
        </div>
      </div>
    </div>
  );
};

export default StudentAboutMe;
