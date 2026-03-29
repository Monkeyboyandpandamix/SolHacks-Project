use anchor_lang::prelude::*;

declare_id!("7mLLxJS9dsoEGMdCZjx5tfxpGzera62zCYqRszBDuMPt"); // Playground will update this on deploy

#[program]
pub mod civic_actions {
    use super::*;

    pub fn record_action(
        ctx: Context<RecordAction>,
        action_type: String,
    ) -> Result<()> {
        let action = &mut ctx.accounts.action_account;

        action.user = *ctx.accounts.user.key;
        action.action_type = action_type;
        action.timestamp = Clock::get()?.unix_timestamp;

        msg!("Civic action recorded successfully!");
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(action_type: String)]
pub struct RecordAction<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 4 + 50 + 8, // discriminator + pubkey + string + timestamp
        seeds = [b"action", user.key().as_ref(), action_type.as_bytes()],
        bump
    )]
    pub action_account: Account<'info, CivicAction>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct CivicAction {
    pub user: Pubkey,        // 32 bytes
    pub action_type: String, // up to ~50 chars
    pub timestamp: i64,      // 8 bytes
}