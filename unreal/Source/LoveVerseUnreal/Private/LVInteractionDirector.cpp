#include "LVInteractionDirector.h"

#include "LVAvatarCharacter.h"

ALVInteractionDirector::ALVInteractionDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    bReplicates = true;
}

void ALVInteractionDirector::BeginPlay()
{
    Super::BeginPlay();
}

void ALVInteractionDirector::StartAuthorizedInteraction(ALVAvatarCharacter* Requester, ALVAvatarCharacter* Recipient, ELVCoupleInteraction Interaction)
{
    if (!HasAuthority() || !CanStartInteraction(Requester, Recipient, Interaction))
    {
        return;
    }

    UserAvatar = Requester;
    PartnerAvatar = Recipient;
    ActiveInteraction = Interaction;
    ActiveDefinition = GetDefinition(Interaction);
    UserApproachStart = UserAvatar->GetActorLocation();
    PartnerApproachStart = PartnerAvatar->GetActorLocation();

    const FVector Midpoint = (UserApproachStart + PartnerApproachStart) * 0.5f;
    const FVector FacingDirection = (PartnerApproachStart - UserApproachStart).GetSafeNormal2D();
    const FVector Separation = FacingDirection * 42.0f;
    UserTarget = Midpoint - Separation;
    PartnerTarget = Midpoint + Separation;
    ApproachStartedAt = GetWorld()->GetTimeSeconds();
    bApproaching = true;
}

void ALVInteractionDirector::ResetToIdle()
{
    if (HasAuthority())
    {
        FinishInteraction();
    }
}

void ALVInteractionDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!HasAuthority() || !UserAvatar || !PartnerAvatar)
    {
        return;
    }

    const float Now = GetWorld()->GetTimeSeconds();
    if (bApproaching)
    {
        const float RawAlpha = FMath::Clamp((Now - ApproachStartedAt) / ActiveDefinition.ApproachDuration, 0.0f, 1.0f);
        const float Alpha = FMath::InterpEaseInOut(0.0f, 1.0f, RawAlpha, 2.0f);
        UserAvatar->SetActorLocation(FMath::Lerp(UserApproachStart, UserTarget, Alpha), true);
        PartnerAvatar->SetActorLocation(FMath::Lerp(PartnerApproachStart, PartnerTarget, Alpha), true);
        UserAvatar->SetLookAtTarget(PartnerAvatar->GetActorLocation());
        PartnerAvatar->SetLookAtTarget(UserAvatar->GetActorLocation());

        if (RawAlpha >= 1.0f)
        {
            bApproaching = false;
            bInteractionPlaying = true;
            InteractionStartedAt = Now;
            MulticastPlayInteractionPose(ActiveInteraction);
        }
        return;
    }

    if (bInteractionPlaying && Now - InteractionStartedAt >= ActiveDefinition.InteractionDuration)
    {
        FinishInteraction();
    }
}

void ALVInteractionDirector::MulticastPlayInteractionPose_Implementation(ELVCoupleInteraction Interaction)
{
    if (UserAvatar) UserAvatar->PlayInteractionPose(Interaction, false);
    if (PartnerAvatar) PartnerAvatar->PlayInteractionPose(Interaction, true);
}

void ALVInteractionDirector::MulticastResetToIdle_Implementation()
{
    if (UserAvatar) UserAvatar->PlayInteractionPose(ELVCoupleInteraction::Idle, false);
    if (PartnerAvatar) PartnerAvatar->PlayInteractionPose(ELVCoupleInteraction::Idle, true);
}

bool ALVInteractionDirector::CanStartInteraction(ALVAvatarCharacter* Requester, ALVAvatarCharacter* Recipient, ELVCoupleInteraction Interaction) const
{
    if (!Requester || !Recipient || Requester == Recipient || Interaction == ELVCoupleInteraction::Idle)
    {
        return false;
    }
    return FVector::Dist2D(Requester->GetActorLocation(), Recipient->GetActorLocation()) <= GetDefinition(Interaction).RequiredDistance;
}

FLVInteractionDefinition ALVInteractionDirector::GetDefinition(ELVCoupleInteraction Interaction) const
{
    FLVInteractionDefinition Definition;
    Definition.Interaction = Interaction;
    switch (Interaction)
    {
    case ELVCoupleInteraction::Kiss:
    case ELVCoupleInteraction::ForeheadKiss:
        Definition.InteractionDuration = 2.0f;
        break;
    case ELVCoupleInteraction::Dance:
        Definition.InteractionDuration = 6.0f;
        break;
    default:
        break;
    }
    return Definition;
}

void ALVInteractionDirector::FinishInteraction()
{
    bApproaching = false;
    bInteractionPlaying = false;
    ActiveInteraction = ELVCoupleInteraction::Idle;
    MulticastResetToIdle();
}
