'use client';

import { useEffect, useState } from 'react';
import sdk from '@farcaster/frame-sdk';
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { base } from 'wagmi/chains';
import { todoAbi, CONTRACT_ADDRESS } from '@/lib/contract';
import { siteConfig } from '@/lib/site';
import { decodeTaskText, encodeTaskText, getReadableError, isAscii, normalizeIndex, shortenAddress } from '@/lib/utils';
import { trackTransaction } from '@/utils/track';

function ConnectButtons() {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="action-row">
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          className="button button-secondary"
          disabled={isPending}
          onClick={() => connect({ connector })}
          type="button"
        >
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}

export function BlockTodoApp() {
  const [draft, setDraft] = useState('');
  const [focusIndex, setFocusIndex] = useState('0');
  const [message, setMessage] = useState('Connect a wallet to create, complete, and remove tasks on Base.');
  const [tasks, setTasks] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [pendingAction, setPendingAction] = useState('');
  const [lastTrackedHash, setLastTrackedHash] = useState('');
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { data: taskCount } = useReadContract({
    abi: todoAbi,
    address: CONTRACT_ADDRESS,
    functionName: 'getTaskCount',
    query: { refetchInterval: 12000 },
  });
  const { writeContractAsync, data: txHash, isPending: isWriting } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  useEffect(() => {
    if (receipt.isSuccess && txHash && address && lastTrackedHash !== txHash) {
      trackTransaction('app-002', 'BlockTodo', address, txHash);
      setLastTrackedHash(txHash);
      setMessage(`${pendingAction || 'Transaction'} confirmed: ${txHash}`);
      setDraft('');
      setRefreshTick((value) => value + 1);
    }
  }, [address, lastTrackedHash, pendingAction, receipt.isSuccess, txHash]);

  useEffect(() => {
    if (receipt.isError) {
      setMessage('Transaction failed. Please try again.');
    }
  }, [receipt.isError]);

  useEffect(() => {
    if (!publicClient) {
      setTasks([]);
      return;
    }

    let cancelled = false;

    async function loadTasks() {
      setLoadingBoard(true);
      try {
        const total = await publicClient.readContract({
          abi: todoAbi,
          address: CONTRACT_ADDRESS,
          functionName: 'getTaskCount',
        });

        const numericTotal = Number(total);
        const start = Math.max(0, numericTotal - 8);
        const indexes = [];

        for (let index = numericTotal - 1; index >= start; index -= 1) {
          indexes.push(index);
        }

        const nextTasks = await Promise.all(
          indexes.map(async (index) => {
            const [rawContent, completed] = await publicClient.readContract({
              abi: todoAbi,
              address: CONTRACT_ADDRESS,
              functionName: 'getTask',
              args: [BigInt(index)],
            });

            return {
              id: index,
              content: decodeTaskText(rawContent),
              completed,
            };
          }),
        );

        if (!cancelled) {
          setTasks(nextTasks);
        }
      } catch {
        if (!cancelled) {
          setMessage('The live task board could not be loaded right now.');
        }
      } finally {
        if (!cancelled) {
          setLoadingBoard(false);
        }
      }
    }

    loadTasks();
    return () => {
      cancelled = true;
    };
  }, [publicClient, refreshTick]);

  async function submitWrite({ functionName, args, actionLabel }) {
    if (!isConnected) {
      setMessage('Connect a wallet before sending a transaction.');
      return;
    }

    if (chainId !== base.id) {
      setMessage('Switch your wallet to Base Mainnet and try again.');
      return;
    }

    if (!publicClient) {
      setMessage('Base RPC is not ready yet. Please try again.');
      return;
    }

    setMessage(`Preparing ${actionLabel.toLowerCase()}...`);
    setPendingAction(actionLabel);

    try {
      await publicClient.simulateContract({
        abi: todoAbi,
        address: CONTRACT_ADDRESS,
        functionName,
        args,
        account: address,
      });

      await writeContractAsync({
        abi: todoAbi,
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      });
      setMessage('Waiting for wallet confirmation...');
    } catch (error) {
      setMessage(getReadableError(error));
    }
  }

  async function createTask() {
    const trimmed = draft.trim();

    if (!trimmed) {
      setMessage('Enter a short todo before sending.');
      return;
    }

    if (!isAscii(trimmed)) {
      setMessage('Use plain ASCII text only so it fits the bytes32 contract format.');
      return;
    }

    if (trimmed.length > 31) {
      setMessage('Keep the task within 31 ASCII characters.');
      return;
    }

    await submitWrite({
      functionName: 'addTask',
      args: [encodeTaskText(trimmed)],
      actionLabel: 'Add task',
    });
  }

  async function toggleTask(index) {
    const total = Number(taskCount ?? 0n);
    if (index < 0 || index >= total) {
      setMessage(`Task #${index} does not exist onchain.`);
      return;
    }

    await submitWrite({
      functionName: 'toggleTask',
      args: [BigInt(index)],
      actionLabel: `Toggle task #${index}`,
    });
  }

  async function deleteTask(index) {
    const total = Number(taskCount ?? 0n);
    if (index < 0 || index >= total) {
      setMessage(`Task #${index} does not exist onchain.`);
      return;
    }

    await submitWrite({
      functionName: 'deleteTask',
      args: [BigInt(index)],
      actionLabel: `Delete task #${index}`,
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">Base mini app / productivity + utility</span>
          <h1>BlockTodo keeps your task board live on Base.</h1>
          <p>
            Create todos, flip completion, delete stale work, and verify everything against the
            contract from one English-first mini app experience.
          </p>
          <div className="hero-stats">
            <article>
              <strong>Base Mainnet</strong>
              <span>Chain</span>
            </article>
            <article>
              <strong>{taskCount ? taskCount.toString() : '...'}</strong>
              <span>Current tasks</span>
            </article>
            <article>
              <strong>app-002</strong>
              <span>Attribution ID</span>
            </article>
          </div>
        </div>

        <div className="wallet-card">
          <div className="inline-between">
            <strong>Wallet access</strong>
            <span className="pill">{isConnected ? 'Connected' : 'Ready'}</span>
          </div>
          <div className="wallet-list">
            <div>
              <div className="caption">Current address</div>
              <div className="mono">{address ? shortenAddress(address) : 'Connect to start'}</div>
            </div>
            {!isConnected ? (
              <ConnectButtons />
            ) : (
              <button className="button button-secondary" onClick={() => disconnect()} type="button">
                Disconnect
              </button>
            )}
            <div className="caption">{message}</div>
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="composer-card">
          <div className="panel-top">
            <div>
              <h2>Create a new onchain task</h2>
              <p>Each task is stored as bytes32, so short phrasing keeps gas low and reads fast.</p>
            </div>
            <span className="chip">Write</span>
          </div>
          <label className="field">
            <span>Task text</span>
            <input
              className="input"
              maxLength={31}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ship BlockTodo launch"
              value={draft}
            />
          </label>
          <div className="caption">Up to 31 ASCII characters to fit the contract storage format.</div>
          <button className="button button-primary" disabled={!isConnected || isWriting} onClick={createTask} type="button">
            {isWriting ? 'Waiting...' : 'Add task on Base'}
          </button>

          <div className="mini-meta">
            <article>
              <span>Contract</span>
              <strong className="mono">{CONTRACT_ADDRESS}</strong>
            </article>
            <article>
              <span>App type</span>
              <strong>Productivity + Utility</strong>
            </article>
            <article>
              <span>Builder code</span>
              <strong>{siteConfig.builderCode || 'Pending'}</strong>
            </article>
          </div>
        </div>

        <div className="focus-card">
          <div className="panel-top">
            <div>
              <h2>Quick action by index</h2>
              <p>Use a direct index when you want to operate on a specific task immediately.</p>
            </div>
            <span className="chip">Control</span>
          </div>
          <label className="field">
            <span>Task index</span>
            <input
              className="input"
              inputMode="numeric"
              onChange={(event) => setFocusIndex(event.target.value)}
              value={focusIndex}
            />
          </label>
          <div className="action-row">
            <button
              className="button button-primary"
              disabled={!isConnected || isWriting}
              onClick={() => toggleTask(normalizeIndex(focusIndex))}
              type="button"
            >
              Toggle task
            </button>
            <button
              className="button button-ghost"
              disabled={!isConnected || isWriting}
              onClick={() => deleteTask(normalizeIndex(focusIndex))}
              type="button"
            >
              Delete task
            </button>
          </div>
        </div>
      </section>

      <section className="board-grid">
        <div className="board-card">
          <div className="panel-top">
            <div>
              <h3>Live task board</h3>
              <p>Latest contract rows, loaded directly from Base and refreshed on demand.</p>
            </div>
            <button className="button button-ghost" onClick={() => setRefreshTick((value) => value + 1)} type="button">
              Refresh
            </button>
          </div>

          <div className="task-list">
            {loadingBoard ? <div className="task-item">Loading tasks...</div> : null}
            {!loadingBoard && tasks.length === 0 ? (
              <div className="task-item">No tasks have been loaded from the contract yet.</div>
            ) : null}
            {tasks.map((task) => (
              <article className="task-item" key={task.id}>
                <header className="task-head">
                  <h4>Task #{task.id}</h4>
                  <span className={`status-badge ${task.completed ? 'status-complete' : 'status-open'}`}>
                    {task.completed ? 'Completed' : 'Open'}
                  </span>
                </header>
                <div>{task.content}</div>
                <div className="task-actions">
                  <button
                    className="button button-secondary"
                    disabled={!isConnected || isWriting}
                    onClick={() => toggleTask(task.id)}
                    type="button"
                  >
                    Toggle
                  </button>
                  <button
                    className="button button-ghost"
                    disabled={!isConnected || isWriting}
                    onClick={() => deleteTask(task.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="meta-card">
          <div className="panel-top">
            <div>
              <h3>Launch readiness</h3>
              <p>Metadata is wired for Base app discovery, verification, previews, and attribution.</p>
            </div>
            <span className="chip">Ready</span>
          </div>

          <div className="meta-list">
            <article>
              <span>Name</span>
              <strong>{siteConfig.name}</strong>
            </article>
            <article>
              <span>Canonical</span>
              <strong className="mono">{siteConfig.url}</strong>
            </article>
            <article>
              <span>Base app ID</span>
              <strong>69c344215262875b1be38c59</strong>
            </article>
            <article>
              <span>Contract type</span>
              <strong>Stateful storage</strong>
            </article>
          </div>

          <div className="readiness-list">
            <div>Hardcoded base:app_id and talentapp verification tags in the head.</div>
            <div>coinbaseWallet plus injected only, with no WalletConnect project ID.</div>
            <div>ox attribution support kept in Wagmi config for builder code insertion.</div>
            <div>trackTransaction fires after confirmed add, toggle, and delete writes.</div>
            <div>Canonical, Open Graph, Twitter, frame, icon, splash, and screenshots point at production.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
