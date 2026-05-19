export default function ProgressBar({ progress, label, color = '#2563eb' }) {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: progress + '%', background: color }}
        />
      </div>
    </div>
  );
}
