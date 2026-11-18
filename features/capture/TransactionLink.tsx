import { Button } from "@/components/Button";
import { TransactionType } from "@/types";
import { Link } from "expo-router";

interface TransactionLinkProps {
  transactionType: TransactionType;
  label: string;
}

export const TransactionLink = ({
  transactionType,
  label,
}: TransactionLinkProps) => (
  <Link
    href={{
      pathname: "/capture/[transactionType]",
      params: { transactionType },
    }}
    asChild
  >
    <Button text={label} />
  </Link>
);
