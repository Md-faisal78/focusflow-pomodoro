import React from 'react';
import clsx from 'clsx';
import { useApp } from '../../store/AppContext.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';

export default function TimerControls({ className }) {
  const { state, actions } = useApp();
  const { isRunning, remaining, initialDuration } = state.timer;
  const idle = !isRunning && remaining === initialDuration;

  return (
    <div className={clsx('mt-8 flex flex-wrap items-center justify-center gap-3', className)}>
      <Button
        onClick={isRunning ? actions.pauseTimer : actions.startTimer}
        className="min-w-[10rem] py-3 text-base"
      >
        <Icon name={isRunning ? 'pause' : 'play'} size={20} />
        {isRunning ? 'Pause' : idle ? 'Start' : 'Resume'}
      </Button>
      <Button variant="secondary" onClick={actions.resetTimer} disabled={idle} className="py-3">
        <Icon name="reset" size={18} />
        Reset
      </Button>
    </div>
  );
}
