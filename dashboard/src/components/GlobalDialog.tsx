import React, { useState, useEffect } from 'react';
import { useDialogStore } from '../stores/dialogStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function GlobalDialog() {
  const { confirmDialog, promptDialog, closeConfirm, closePrompt } = useDialogStore();
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    if (promptDialog) {
      setPromptValue(promptDialog.defaultValue || '');
    }
  }, [promptDialog]);

  return (
    <>
      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && closeConfirm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title || 'Emin misiniz?'}</DialogTitle>
            <DialogDescription>{confirmDialog?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { confirmDialog?.onCancel?.(); closeConfirm(); }}>
              {confirmDialog?.cancelText || 'İptal'}
            </Button>
            <Button variant="destructive" onClick={() => { confirmDialog?.onConfirm(); closeConfirm(); }}>
              {confirmDialog?.confirmText || 'Evet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog open={!!promptDialog} onOpenChange={(open) => !open && closePrompt()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{promptDialog?.title}</DialogTitle>
            <DialogDescription>{promptDialog?.message}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <Input 
                value={promptValue} 
                onChange={(e) => setPromptValue(e.target.value)}
                autoFocus
             />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { promptDialog?.onCancel?.(); closePrompt(); }}>İptal</Button>
            <Button onClick={() => { promptDialog?.onConfirm(promptValue); closePrompt(); }}>Tamam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
