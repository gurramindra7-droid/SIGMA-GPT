// src/components/AboutModal.jsx
import Modal from "./Modal";
import SigmaMark from "./SigmaMark";

export default function AboutModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="About">
      <div className="about-brand">
        <SigmaMark size={54} />
        <h2 className="about-brand-name">
          <span className="sigma-accent">SIGMA</span>-GPT
        </h2>
        <p className="about-tagline">An Intelligent AI Conversation Experience</p>
      </div>

      <p className="about-credit">ENGINEERED BY</p>
      <p className="about-credit-name">GURRAM INDRASENA YADAV</p>

      <div className="about-facts">
        <div className="about-fact">
          <span className="about-fact-label">Platform</span>
          <span className="about-fact-value">Web</span>
        </div>
        <div className="about-fact">
          <span className="about-fact-label">AI Inference</span>
          <span className="about-fact-value">Groq</span>
        </div>
        <div className="about-fact">
          <span className="about-fact-label">Status</span>
          <span className="about-fact-value">Operational</span>
        </div>
      </div>
    </Modal>
  );
}
