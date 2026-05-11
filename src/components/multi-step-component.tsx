"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";

import styles from "./multi-step-component.module.css";

export default function MultiStepComponent() {
  const [currentStep, setCurrentStep] = useState(0);

  const content = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <h2 className={styles.heading}>This is step one</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className={styles.skeletons}>
              <div className={styles.skeleton} style={{ width: 256 }} />
              <div className={styles.skeleton} style={{ width: 192 }} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} style={{ width: 384 }} />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h2 className={styles.heading}>This is step two</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className={styles.skeletons}>
              <div className={styles.skeleton} style={{ width: 256 }} />
              <div className={styles.skeleton} style={{ width: 192 }} />
              <div className={styles.skeleton} style={{ width: 384 }} />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className={styles.heading}>This is step three</h2>
            <p>
              Usually in this step we would explain why this thing exists and
              what it does. Also, we would show a button to go to the next step.
            </p>
            <div className={styles.skeletons}>
              <div className={styles.skeleton} style={{ width: 256 }} />
              <div className={styles.skeleton} style={{ width: 192 }} />
              <div className={styles.skeleton} style={{ width: 128 }} />
              <div className={styles.skeleton} style={{ width: 224 }} />
              <div className={styles.skeleton} style={{ width: 384 }} />
            </div>
          </>
        );
      default:
        return null;
    }
  }, [currentStep]);

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
      <div className={styles.multiStepWrapper}>
        <div className={styles.multiStepInner}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ x: "110%", opacity: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ x: "-110%", opacity: 0 }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
          <motion.div layout className={styles.actions}>
            <button
              className={styles.secondaryButton}
              disabled={currentStep === 0}
              onClick={() => {
                if (currentStep === 0) {
                  return;
                }
                setCurrentStep((prev) => prev - 1);
              }}
            >
              Back
            </button>
            <button
              className={styles.primaryButton}
              disabled={currentStep === 2}
              onClick={() => {
                if (currentStep === 2) {
                  setCurrentStep(0);
                  return;
                }
                setCurrentStep((prev) => prev + 1);
              }}
            >
              <span>Continue</span>
            </button>
          </motion.div>
        </div>
      </div>
    </MotionConfig>
  );
}
