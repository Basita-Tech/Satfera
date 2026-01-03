import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
export function WithdrawModal({
  open,
  onOpenChange,
  profileName,
  onConfirm
}) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[20px] max-w-md !top-[52%] my-12 mx-4">
        <AlertDialogHeader>
          <AlertDialogTitle style={{
          fontFamily: 'Playfair Display, serif'
        }}>
            Withdraw Interest?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#222222]">
            Withdraw interest for{' '}
            <span style={{
            fontWeight: 600
          }}>{profileName}</span>? This will
            remove the request and notify them.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-[12px] border-border-subtle">
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction onClick={onConfirm} className="bg-red-accent hover:bg-red-accent/90 text-white rounded-[12px]">
            Confirm Withdraw
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>;
}